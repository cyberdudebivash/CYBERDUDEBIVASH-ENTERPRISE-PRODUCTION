import type { AuthConfig } from "@auth/core";
import { Auth } from "@auth/core";
import type { QuestionBank } from "@titan/assessment-core";
import { dpdpV1, scoreAssessment } from "@titan/assessment-core";
import type {
  AssessmentRepository,
  AuditRepository,
  LeadLifecyclePatch,
  LeadRepository,
  LeadSearchOptions,
  NewAssessment,
  NewLead,
  OrganizationRepository,
  UserProfileRecord,
  UserProfileRepository,
} from "./repositories/types.js";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "./repositories/types.js";
import { jsonError, jsonSuccess } from "./http/responses.js";
import { preflightResponse, resolveAllowedOrigin } from "./http/cors.js";
import { authPagesCsp, finalizeResponse, STRICT_CSP } from "./http/finalizeResponse.js";
import { createLogger, type Logger } from "./observability/logger.js";
import { createInMemoryMetrics, type Metrics } from "./observability/metrics.js";
import { resolveRequestId } from "./observability/requestId.js";
import { createInMemoryRateLimiter, type RateLimiter } from "./security/rateLimiter.js";
import { isTrustedOrigin } from "./security/csrf.js";
import { getSession } from "./auth/session.js";
import {
  requireAssessmentAccess,
  requireLeadsAccess,
  requirePlatformAdministrator,
} from "./auth/authorize.js";
import { isPlatformAdministrator } from "./auth/rbac.js";
import {
  fail,
  ok,
  requireJsonObject,
  requireNonEmptyString,
  requirePlainObject,
  optionalNullableString,
  type ValidationResult,
} from "./validation/primitives.js";

export interface Dependencies {
  leads: LeadRepository;
  assessments: AssessmentRepository;
  audit: AuditRepository;
  /** EAP-1: backs `GET /api/organizations` (the admin Dashboard's org
   * metrics). Optional for the same reason every other repository-adjacent
   * dependency here is — existing tests that don't exercise that route stay
   * unaffected. */
  organizations?: OrganizationRepository;
  logger?: Logger;
  rateLimiter?: RateLimiter;
  /** Separate, stricter limiter for /api/auth/* (RC1 Workstream 2): sign-in
   * and magic-link requests are a classic abuse target (brute force,
   * email-bombing a victim's inbox via repeated sign-in requests) — a
   * legitimate user rarely needs more than a couple of attempts a minute,
   * so this defaults tighter than the general API limiter. */
  authRateLimiter?: RateLimiter;
  metrics?: Metrics;
  allowedOrigin?: string;
  /** Workstream 5. Optional so every existing router test (and any caller
   * that doesn't need auth yet) keeps working unchanged — /api/auth/* only
   * exists when a real AuthConfig (auth/config.ts's createAuthConfig) is
   * supplied. */
  authConfig?: AuthConfig;
  /** Security Release Blocker Sprint: backs `resolveCaller`'s lookup from an
   * authenticated session's user id to that user's UserProfileRecord[]
   * (role + organization memberships). Optional for the same reason
   * `authConfig` is — a route that calls `resolveCaller` without both
   * `authConfig` and `userProfiles` configured treats every caller as
   * anonymous rather than throwing, so existing tests that don't need auth
   * are unaffected. */
  userProfiles?: UserProfileRepository;
  /**
   * RC1 Workstream 6 (readiness probe). `GET /health` is pure liveness — it
   * answers instantly and never touches D1, so it can't distinguish "the
   * Worker is running" from "the Worker is running but its database is
   * unreachable". This, when supplied, backs `GET /health/ready`: a real
   * dependency check (worker.ts wires this to a trivial `SELECT 1` against
   * env.DB), returning false/rejecting instead of throwing lets the router
   * turn a real outage into a 503, not an unhandled exception. Kept out of
   * router.ts's own D1 knowledge (this stays a plain function, no
   * D1Database import here) — consistent with the Repository Pattern
   * boundary ARCHITECTURE.md's audit confirmed holds everywhere else.
   */
  readinessCheck?: () => Promise<boolean>;
}

const defaultRateLimiter = createInMemoryRateLimiter({ limit: 30, windowMs: 60_000 });
const defaultAuthRateLimiter = createInMemoryRateLimiter({ limit: 10, windowMs: 60_000 });
const defaultMetrics = createInMemoryMetrics();

/**
 * Pure request -> response routing, independent of the Cloudflare Workers
 * runtime (uses only the standard Request/Response/URL APIs, available
 * natively in Node) and independent of D1 (takes repository interfaces, not
 * env bindings) — so it's testable directly, without workerd. worker.ts is
 * the thin adapter that wires this to a real env at the actual Workers
 * entrypoint.
 *
 * Every response — success or error — goes through jsonSuccess/jsonError so
 * security headers and the request id land everywhere exactly once
 * (Workstream 7/8), and every request is logged at completion with its
 * status and duration (Workstream 8).
 */
export async function handleRequest(request: Request, deps: Dependencies): Promise<Response> {
  const requestId = resolveRequestId(request);
  const logger = deps.logger ?? createLogger();
  const rateLimiter = deps.rateLimiter ?? defaultRateLimiter;
  const authRateLimiter = deps.authRateLimiter ?? defaultAuthRateLimiter;
  const metrics = deps.metrics ?? defaultMetrics;
  const allowedOrigin = resolveAllowedOrigin(deps.allowedOrigin);
  const url = new URL(request.url);
  const startedAt = Date.now();

  if (request.method === "OPTIONS") {
    return preflightResponse(allowedOrigin);
  }

  let response: Response;
  try {
    response = await route(request, url, deps, {
      requestId,
      logger,
      rateLimiter,
      authRateLimiter,
      allowedOrigin,
      metrics,
    });
  } catch (error) {
    logger.error("Unhandled error while routing request", {
      requestId,
      path: url.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });
    response = jsonError(
      { code: "internal_error", message: "Internal server error" },
      requestId,
      500,
    );
  }

  // Auth.js's own /api/auth/* actions can render real HTML (its default
  // sign-in page) — a materially different content type than every other
  // route here, which only ever returns JSON. See finalizeResponse.ts for
  // why the CSP differs specifically for this path prefix.
  const csp = url.pathname.startsWith("/api/auth/") ? authPagesCsp(allowedOrigin) : STRICT_CSP;
  response = finalizeResponse(response, requestId, allowedOrigin, csp);
  const durationMs = Date.now() - startedAt;

  const metricTags = {
    method: request.method,
    path: url.pathname,
    status: String(response.status),
  };
  metrics.increment("http.request", metricTags);
  metrics.recordDuration("http.request.duration_ms", durationMs, metricTags);

  logger.info("request completed", {
    requestId,
    method: request.method,
    path: url.pathname,
    status: response.status,
    durationMs,
  });

  return response;
}

interface RouteContext {
  requestId: string;
  logger: Logger;
  rateLimiter: RateLimiter;
  authRateLimiter: RateLimiter;
  allowedOrigin: string;
  metrics: Metrics;
}

/**
 * RC1 Workstream 6 (operation timing). Total request duration
 * (http.request.duration_ms) can't tell you whether a slow response was
 * spent in the repository call or somewhere else in the handler (audit
 * write, validation, serialization) — this records just the repository
 * call's own duration under a distinct metric name, real operational
 * signal for diagnosing D1 latency without needing Cloudflare's own
 * tracing (which requires a deployed account this project doesn't have).
 */
async function withOperationTiming<T>(
  metrics: Metrics,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    metrics.recordDuration("repository.duration_ms", Date.now() - startedAt, { operation });
  }
}

const ASSESSMENT_ID_PATTERN = /^\/api\/assessments\/([^/]+)$/;
const LEAD_ID_PATTERN = /^\/api\/leads\/([^/]+)$/;

async function route(
  request: Request,
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (url.pathname === "/health" && request.method === "GET") {
    return healthResponse();
  }

  if (url.pathname === "/health/ready" && request.method === "GET") {
    return readinessResponse(deps, ctx);
  }

  if (url.pathname.startsWith("/api/auth/") && deps.authConfig) {
    // POST covers sign-in/callback/signout — the actions worth abuse-limiting
    // (brute force, email-bombing a victim via repeated magic-link
    // requests). GET actions (session/providers/csrf) are read-only and
    // stay unlimited, same as /api/leads's own GET.
    if (request.method === "POST" && !checkRateLimit(request, ctx, ctx.authRateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    return Auth(request, deps.authConfig);
  }

  if (url.pathname === "/api/leads" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    return createLead(request, deps, ctx);
  }

  if (url.pathname === "/api/leads" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requireLeadsAccess(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return listLeads(deps, ctx);
  }

  // EAP-2: checked before LEAD_ID_PATTERN below, or "search" would be
  // parsed as a lead id. Same Platform-Administrator policy as GET
  // /api/leads (requireLeadsAccess === requirePlatformAdministrator) — this
  // is the same cross-organization, unfiltered-by-tenant read, just
  // filtered/sorted/paginated instead of returned whole.
  if (url.pathname === "/api/leads/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requireLeadsAccess(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchLeads(url, deps, ctx);
  }

  const leadMatch = LEAD_ID_PATTERN.exec(url.pathname);
  if (leadMatch?.[1] && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requireLeadsAccess(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return getLead(leadMatch[1], caller, deps, ctx);
  }

  // EAP-2: a real write on an authenticated route — the same cross-origin
  // forgery risk isTrustedOrigin already closes for the anonymous
  // POST /api/leads/POST /api/assessments (security/csrf.ts), except here a
  // forged request would also carry the caller's own session cookie along
  // with it, which makes the check more important, not less.
  if (leadMatch?.[1] && request.method === "PATCH") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requireLeadsAccess(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return updateLead(leadMatch[1], request, caller, deps, ctx);
  }

  if (url.pathname === "/api/assessments" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    return createAssessment(request, deps, ctx);
  }

  if (url.pathname === "/api/assessments" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return listAssessments(deps, ctx);
  }

  const assessmentMatch = ASSESSMENT_ID_PATTERN.exec(url.pathname);
  if (assessmentMatch?.[1] && request.method === "GET") {
    return getAssessment(assessmentMatch[1], request, deps, ctx);
  }

  if (url.pathname === "/api/organizations" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return listOrganizations(deps, ctx);
  }

  if (url.pathname === "/api/audit" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return listAuditEvents(url, deps, ctx);
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    return meResponse(caller);
  }

  return jsonError({ code: "not_found", message: "Not found" }, ctx.requestId, 404);
}

interface Caller {
  userId: string;
  email: string | null | undefined;
  profiles: UserProfileRecord[];
}

/**
 * Security Release Blocker Sprint: resolves "who is calling" for any
 * protected route — a real Auth.js session (database strategy, so this is a
 * live D1 lookup via `getSession`, not just decoding a token) joined with
 * that user's `UserProfileRecord[]` (role + organization memberships).
 * Returns `null` for anonymous callers and, deliberately, for a request
 * this deployment can't even evaluate (no `authConfig`/`userProfiles`
 * wired) — an unconfigured protected route must fail closed (401), not
 * silently grant access.
 */
async function resolveCaller(request: Request, deps: Dependencies): Promise<Caller | null> {
  if (!deps.authConfig || !deps.userProfiles) return null;
  const session = await getSession(request, deps.authConfig);
  const userId = session?.user?.id;
  if (!userId) return null;
  const profiles = await deps.userProfiles.findByUserId(userId);
  return { userId, email: session?.user?.email, profiles };
}

function unauthorized(requestId: string): Response {
  return jsonError({ code: "unauthorized", message: "Authentication required" }, requestId, 401);
}

function checkRateLimit(request: Request, ctx: RouteContext, limiter: RateLimiter): boolean {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  const result = limiter.check(key);
  if (!result.allowed) {
    ctx.logger.warn("rate limit exceeded", { requestId: ctx.requestId, key });
  }
  return result.allowed;
}

function tooManyRequests(requestId: string): Response {
  return jsonError({ code: "rate_limited", message: "Too many requests" }, requestId, 429);
}

function forbiddenOrigin(requestId: string): Response {
  return jsonError(
    { code: "forbidden_origin", message: "Request origin not allowed" },
    requestId,
    403,
  );
}

function healthResponse(): Response {
  return jsonSuccess({
    status: "ok",
    service: "titan-platform",
    timestamp: new Date().toISOString(),
  });
}

/** Real dependency check, not just "the process is running" — see
 * Dependencies.readinessCheck's doc comment. Absent readinessCheck (e.g. a
 * router test with no D1 wired up) reports ready:true — there is nothing
 * to fail against, matching /health's own no-dependency behavior. */
async function readinessResponse(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  if (!deps.readinessCheck) {
    return jsonSuccess({ status: "ready", service: "titan-platform" });
  }

  let ready: boolean;
  try {
    ready = await deps.readinessCheck();
  } catch (error) {
    ctx.logger.error("readiness check threw", {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    ready = false;
  }

  if (!ready) {
    return jsonError(
      { code: "not_ready", message: "A required dependency is unreachable" },
      ctx.requestId,
      503,
    );
  }

  return jsonSuccess({ status: "ready", service: "titan-platform" });
}

async function readJsonBody(request: Request): Promise<ValidationResult<unknown>> {
  try {
    return ok(await request.json());
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

async function createLead(
  request: Request,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }

  const validation = validateNewLead(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }

  // Server trust (Security Release Blocker Sprint): the client's own
  // `result` is validated for shape above but never trusted for its
  // *value* — a visitor could otherwise submit `answers` indicating high
  // risk alongside a hand-edited LOW-risk `result`, corrupting the
  // business's own lead data (SECURITY_GUIDE.md's tampering finding). The
  // visitor's on-screen result stays whatever they saw client-side; this
  // only affects what's persisted. `dpdpV1` directly, not a lookup: `NewLead`
  // has no framework selector and assessment-core ships exactly one bank.
  const recomputedResult = scoreAssessment(dpdpV1.questions, validation.value.answers);

  const saved = await withOperationTiming(ctx.metrics, "leads.save", () =>
    deps.leads.save({ ...validation.value, result: recomputedResult }),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: null,
    organizationId: saved.organizationId,
    action: "lead.created",
    entityType: "lead",
    entityId: saved.id,
    metadata: { source: saved.source },
    createdAt: saved.timestamp,
  });

  return jsonSuccess(saved, 201);
}

async function listLeads(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const leads = await withOperationTiming(ctx.metrics, "leads.list", () => deps.leads.list());
  return jsonSuccess(leads);
}

/** EAP-2: Lead Details. Records a `lead.viewed` audit event on every real
 * read — the "Lead access" trail Workstream 5 asks for — with a real
 * actorId, unlike lead.created/assessment.created (which happen on the
 * anonymous public flow and have never had one). An audit-write failure
 * here follows the same never-fail-the-request contract as
 * recordAuditEvent everywhere else. */
async function getLead(
  id: string,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const lead = await withOperationTiming(ctx.metrics, "leads.findById", () =>
    deps.leads.findById(id),
  );
  if (!lead) {
    return jsonError({ code: "not_found", message: "Lead not found" }, ctx.requestId, 404);
  }

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: lead.organizationId,
    action: "lead.viewed",
    entityType: "lead",
    entityId: lead.id,
    metadata: null,
    createdAt: new Date().toISOString(),
  });

  return jsonSuccess(lead);
}

/** EAP-2: Lead Lifecycle. Diffs the patch against the pre-update record so
 * only fields that actually changed produce an audit event — a PATCH that
 * repeats the current status shouldn't manufacture a fake "status changed"
 * entry in the activity timeline. `note` is not a field on LeadRecord at
 * all (types.ts's LeadLifecyclePatch deliberately excludes it) — a note is
 * always just an audit event (`lead.note_added`), never mutates the lead
 * row, consistent with audit_events being this system's one append-only,
 * immutable log (DECISION_LOG.md's EAP-2 entry). */
async function updateLead(
  id: string,
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const validation = validateLeadLifecyclePatch(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }
  const { patch, note } = validation.value;

  const before = await withOperationTiming(ctx.metrics, "leads.findById", () =>
    deps.leads.findById(id),
  );
  if (!before) {
    return jsonError({ code: "not_found", message: "Lead not found" }, ctx.requestId, 404);
  }

  const after = await withOperationTiming(ctx.metrics, "leads.update", () =>
    deps.leads.update(id, patch),
  );
  // Can't actually be null here (before's existence was just confirmed and
  // nothing else deletes leads) — guarded anyway per LeadRepository.update's
  // own contract rather than asserting past it with a non-null `!`.
  if (!after) {
    return jsonError({ code: "not_found", message: "Lead not found" }, ctx.requestId, 404);
  }

  const now = new Date().toISOString();
  if (patch.status !== undefined && patch.status !== before.status) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: id,
      metadata: { from: before.status, to: after.status },
      createdAt: now,
    });
  }
  if (patch.priority !== undefined && patch.priority !== before.priority) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "lead.priority_changed",
      entityType: "lead",
      entityId: id,
      metadata: { from: before.priority, to: after.priority },
      createdAt: now,
    });
  }
  if (patch.assignedTo !== undefined && patch.assignedTo !== before.assignedTo) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "lead.assigned",
      entityType: "lead",
      entityId: id,
      metadata: { from: before.assignedTo, to: after.assignedTo },
      createdAt: now,
    });
  }
  if (patch.tags !== undefined && JSON.stringify(patch.tags) !== JSON.stringify(before.tags)) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "lead.tags_changed",
      entityType: "lead",
      entityId: id,
      metadata: { from: before.tags, to: after.tags },
      createdAt: now,
    });
  }
  if (note) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "lead.note_added",
      entityType: "lead",
      entityId: id,
      metadata: { note },
      createdAt: now,
    });
  }

  return jsonSuccess(after);
}

const LEAD_SORT_FIELDS = [
  "createdAt",
  "name",
  "company",
  "riskScore",
  "status",
  "priority",
] as const;

/** EAP-2: the Lead Workspace's table — search/filter/sort/pagination, all
 * server-side (`LeadRepository.search`). Query-param parsing is validated
 * the same strictness as a POST body: an unrecognized enum value or a
 * non-numeric page/pageSize is a real 400, not silently ignored, so a
 * frontend bug surfaces instead of quietly returning the wrong page. */
async function searchLeads(url: URL, deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const params = url.searchParams;
  const options: LeadSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const status = params.get("status");
  if (status !== null) {
    if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid status: ${status}` },
        ctx.requestId,
        400,
      );
    }
    options.status = status as LeadSearchOptions["status"];
  }

  const priority = params.get("priority");
  if (priority !== null) {
    if (!LEAD_PRIORITIES.includes(priority as (typeof LEAD_PRIORITIES)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid priority: ${priority}` },
        ctx.requestId,
        400,
      );
    }
    options.priority = priority as LeadSearchOptions["priority"];
  }

  const assignedTo = params.get("assignedTo");
  if (assignedTo) options.assignedTo = assignedTo;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (!LEAD_SORT_FIELDS.includes(sortBy as (typeof LEAD_SORT_FIELDS)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as LeadSearchOptions["sortBy"];
  }

  const sortDirection = params.get("sortDirection");
  if (sortDirection !== null) {
    if (sortDirection !== "asc" && sortDirection !== "desc") {
      return jsonError(
        { code: "validation_error", message: `Invalid sortDirection: ${sortDirection}` },
        ctx.requestId,
        400,
      );
    }
    options.sortDirection = sortDirection;
  }

  for (const [param, field] of [
    ["page", "page"],
    ["pageSize", "pageSize"],
  ] as const) {
    const raw = params.get(param);
    if (raw === null) continue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return jsonError(
        { code: "validation_error", message: `Invalid ${param}: ${raw}` },
        ctx.requestId,
        400,
      );
    }
    options[field] = parsed;
  }

  const result = await withOperationTiming(ctx.metrics, "leads.search", () =>
    deps.leads.search(options),
  );
  return jsonSuccess(result);
}

/** EAP-1: backs the admin Dashboard's assessment metrics. Same cross-org,
 * unfiltered shape as `listLeads` — same Platform-Administrator-only gate,
 * same reasoning (`auth/authorize.ts`'s `requirePlatformAdministrator`). */
async function listAssessments(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const assessments = await withOperationTiming(ctx.metrics, "assessments.list", () =>
    deps.assessments.list(),
  );
  return jsonSuccess(assessments);
}

/** EAP-1: backs the admin Dashboard's organization metrics. Missing
 * `deps.organizations` (an unconfigured deployment, mirroring how
 * `resolveCaller` treats a missing `authConfig`/`userProfiles`) returns an
 * empty list rather than throwing — organizations themselves are the tenant
 * boundary, so there is no "their own organization's data" to fall back to
 * the way `getAssessment` can. */
async function listOrganizations(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  if (!deps.organizations) return jsonSuccess([]);
  const organizations = await withOperationTiming(ctx.metrics, "organizations.list", () =>
    deps.organizations!.list(),
  );
  return jsonSuccess(organizations);
}

/** EAP-1: backs the admin Dashboard's recent-activity/audit-summary
 * sections (no query params: every event). EAP-2: also backs a single
 * lead's own audit-history panel via `?entityType=lead&entityId=...`,
 * reusing this same endpoint rather than a nested `/api/leads/:id/audit`
 * route — the response shape (`AuditEventRecord[]`) never changes, only
 * which events match, so one endpoint with optional filters is the
 * simpler, equally RESTful choice here (unlike `GET /api/leads`, where a
 * filtered/paginated view has a genuinely different response envelope —
 * `GET /api/leads/search`'s reason for being a separate endpoint). */
async function listAuditEvents(url: URL, deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const entityType = url.searchParams.get("entityType") ?? undefined;
  const entityId = url.searchParams.get("entityId") ?? undefined;
  const events = await withOperationTiming(ctx.metrics, "audit.list", () =>
    deps.audit.list({ entityType, entityId }),
  );
  return jsonSuccess(events);
}

/** EAP-1: "who am I" for the frontend — the piece role-aware navigation
 * needs and that `GET /api/auth/session` deliberately doesn't provide
 * (Auth.js's own session payload carries identity, not this application's
 * roles). Any authenticated caller may read their own identity; no
 * Platform-Administrator gate here, unlike the list endpoints above. */
function meResponse(caller: Caller): Response {
  return jsonSuccess({
    userId: caller.userId,
    email: caller.email,
    profiles: caller.profiles,
    isPlatformAdministrator: isPlatformAdministrator(caller.profiles),
  });
}

async function createAssessment(
  request: Request,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }

  const validation = validateNewAssessment(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }

  // Server trust: same principle as createLead, but this endpoint takes an
  // explicit framework/frameworkVersion, so recomputation first has to
  // resolve which question bank to score against.
  const bank = resolveQuestionBank(validation.value.framework, validation.value.frameworkVersion);
  if (!bank) {
    return jsonError(
      { code: "unsupported_framework", message: "Unknown framework or frameworkVersion" },
      ctx.requestId,
      400,
    );
  }
  const recomputedResult = scoreAssessment(bank.questions, validation.value.answers);

  const saved = await withOperationTiming(ctx.metrics, "assessments.save", () =>
    deps.assessments.save({ ...validation.value, result: recomputedResult }),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: saved.createdBy,
    organizationId: saved.organizationId,
    action: "assessment.created",
    entityType: "assessment",
    entityId: saved.id,
    metadata: { framework: saved.framework, frameworkVersion: saved.frameworkVersion },
    createdAt: saved.createdAt,
  });

  return jsonSuccess(saved, 201);
}

async function getAssessment(
  id: string,
  request: Request,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const assessment = await withOperationTiming(ctx.metrics, "assessments.findById", () =>
    deps.assessments.findById(id),
  );
  if (!assessment) {
    return jsonError({ code: "not_found", message: "Assessment not found" }, ctx.requestId, 404);
  }

  // Gated after the lookup, not before: which organization this check is
  // against is a property of the record itself (an assessment's own
  // organizationId), not something the URL alone determines.
  const caller = await resolveCaller(request, deps);
  if (!caller) return unauthorized(ctx.requestId);
  const denied = requireAssessmentAccess(caller.profiles, assessment.organizationId, ctx.requestId);
  if (denied) return denied;

  return jsonSuccess(assessment);
}

// A small, explicit registry — exactly one entry today, matching
// assessment-core's own framing ("DPDP is the first module, not the whole
// product", questions/types.ts). A second real framework is a second entry
// here, not a restructure of resolveQuestionBank.
const QUESTION_BANKS: QuestionBank[] = [dpdpV1];

function resolveQuestionBank(framework: string, frameworkVersion: string): QuestionBank | null {
  return (
    QUESTION_BANKS.find((bank) => bank.id === framework && bank.version === frameworkVersion) ??
    null
  );
}

async function recordAuditEvent(
  deps: Dependencies,
  ctx: RouteContext,
  event: Parameters<AuditRepository["record"]>[0],
): Promise<void> {
  try {
    await deps.audit.record(event);
  } catch (error) {
    // An audit-write failure must not fail the request it's describing —
    // the lead/assessment is already saved — but it must still be logged
    // (Workstream 8: "Errors must also be logged").
    ctx.logger.error("failed to record audit event", {
      requestId: ctx.requestId,
      action: event.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function validateNewLead(value: unknown): ValidationResult<NewLead> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  for (const field of ["name", "email", "company", "timestamp", "source"] as const) {
    const result = requireNonEmptyString(record, field);
    if (!result.ok) return result;
  }
  const answers = requirePlainObject(record, "answers");
  if (!answers.ok) return answers;
  const result = requirePlainObject(record, "result");
  if (!result.ok) return result;

  return ok({
    name: record.name as string,
    email: record.email as string,
    company: record.company as string,
    answers: answers.value as unknown as NewLead["answers"],
    result: result.value as unknown as NewLead["result"],
    timestamp: record.timestamp as string,
    source: record.source as string,
    organizationId: optionalNullableString(record, "organizationId"),
    assessmentId: optionalNullableString(record, "assessmentId"),
  });
}

/** EAP-2. Every field is optional (a PATCH), but a *present* field must be
 * well-formed — an unrecognized status/priority string, or a non-array
 * `tags`, is a real 400, not silently dropped. `assignedTo` distinguishes
 * "not present" (leave unchanged) from "present as null" (clear the
 * assignment) via `in`, not `!== undefined` — the latter can't tell those
 * two cases apart once the value itself is `null`. */
function validateLeadLifecyclePatch(
  value: unknown,
): ValidationResult<{ patch: LeadLifecyclePatch; note: string | null }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  const patch: LeadLifecyclePatch = {};

  if ("status" in record) {
    if (!LEAD_STATUSES.includes(record.status as (typeof LEAD_STATUSES)[number])) {
      return fail(`Invalid status: ${String(record.status)}`);
    }
    patch.status = record.status as LeadLifecyclePatch["status"];
  }

  if ("priority" in record) {
    if (!LEAD_PRIORITIES.includes(record.priority as (typeof LEAD_PRIORITIES)[number])) {
      return fail(`Invalid priority: ${String(record.priority)}`);
    }
    patch.priority = record.priority as LeadLifecyclePatch["priority"];
  }

  if ("assignedTo" in record) {
    if (record.assignedTo !== null && typeof record.assignedTo !== "string") {
      return fail("assignedTo must be a string or null");
    }
    patch.assignedTo = record.assignedTo;
  }

  if ("tags" in record) {
    if (!Array.isArray(record.tags) || !record.tags.every((tag) => typeof tag === "string")) {
      return fail("tags must be an array of strings");
    }
    patch.tags = record.tags;
  }

  const note = typeof record.note === "string" && record.note.trim() !== "" ? record.note : null;

  return ok({ patch, note });
}

function validateNewAssessment(value: unknown): ValidationResult<NewAssessment> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  for (const field of ["framework", "frameworkVersion", "createdAt"] as const) {
    const result = requireNonEmptyString(record, field);
    if (!result.ok) return result;
  }
  const answers = requirePlainObject(record, "answers");
  if (!answers.ok) return answers;
  const result = requirePlainObject(record, "result");
  if (!result.ok) return result;

  return ok({
    framework: record.framework as string,
    frameworkVersion: record.frameworkVersion as string,
    answers: answers.value as unknown as NewAssessment["answers"],
    result: result.value as unknown as NewAssessment["result"],
    createdAt: record.createdAt as string,
    organizationId: optionalNullableString(record, "organizationId"),
    createdBy: optionalNullableString(record, "createdBy"),
  });
}

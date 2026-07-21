import type { AuthConfig } from "@auth/core";
import { Auth } from "@auth/core";
import type { QuestionBank } from "@titan/assessment-core";
import { dpdpV1, scoreAssessment } from "@titan/assessment-core";
import type {
  AssessmentRepository,
  AssessmentSearchOptions,
  AuditEventRecord,
  AuditRepository,
  AuditSearchOptions,
  LeadLifecyclePatch,
  LeadRepository,
  LeadSearchOptions,
  NewAssessment,
  NewLead,
  NewOrganization,
  OrganizationPatch,
  OrganizationRepository,
  OrganizationSearchOptions,
  UserProfilePatch,
  UserProfileRecord,
  UserProfileRepository,
  UserRepository,
  UserRole,
  UserSearchOptions,
} from "./repositories/types.js";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  ORGANIZATION_STATUSES,
  USER_ROLES,
} from "./repositories/types.js";
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
  /** EAP-5: backs the Enterprise User Directory (`GET /api/users/search`,
   * `GET /api/users/:id`) — read-only identity data from Auth.js's own
   * `users` table. Optional for the same reason `organizations` is: an
   * unconfigured deployment fails these specific routes with a 503, not a
   * silent empty result (same reasoning as `organizationsNotConfigured` —
   * every route this dependency backs is unusable without it). */
  users?: UserRepository;
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
const ORGANIZATION_ID_PATTERN = /^\/api\/organizations\/([^/]+)$/;
const USER_ID_PATTERN = /^\/api\/users\/([^/]+)$/;
const USER_PROFILES_PATTERN = /^\/api\/users\/([^/]+)\/profiles$/;
const USER_PROFILE_ID_PATTERN = /^\/api\/users\/([^/]+)\/profiles\/([^/]+)$/;

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

  // EAP-3: checked before ASSESSMENT_ID_PATTERN below, or "search" would be
  // parsed as an assessment id. Same cross-organization, unfiltered-by-tenant
  // shape and policy as GET /api/assessments (list) — requirePlatformAdministrator,
  // not requireAssessmentAccess (that gate is for a single already-scoped
  // record, this is a global search over every organization's assessments).
  if (url.pathname === "/api/assessments/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchAssessments(url, deps, ctx);
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

  // EAP-4: Organization Administration. Unlike leads/assessments, there is no
  // anonymous public flow that creates an organization — every write here is
  // an authenticated Platform Administrator action, so (unlike createLead/
  // createAssessment) this checks CSRF *and* resolves+authorizes the caller
  // before doing anything, the same ordering PATCH /api/leads/:id already
  // uses for its own authenticated write.
  if (url.pathname === "/api/organizations" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return createOrganization(request, caller, deps, ctx);
  }

  // EAP-4: checked before ORGANIZATION_ID_PATTERN below, or "search" would be
  // parsed as an organization id. Same cross-organization, Platform-
  // Administrator-only policy as GET /api/organizations (list) — this is the
  // Organization Workspace's filtered/paginated view of the same data.
  if (url.pathname === "/api/organizations/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchOrganizations(url, deps, ctx);
  }

  const organizationMatch = ORGANIZATION_ID_PATTERN.exec(url.pathname);
  if (organizationMatch?.[1] && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return getOrganization(organizationMatch[1], caller, deps, ctx);
  }

  if (organizationMatch?.[1] && request.method === "PATCH") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return updateOrganization(organizationMatch[1], request, caller, deps, ctx);
  }

  // EAP-5: checked before USER_ID_PATTERN below, or "search" would be parsed
  // as a user id. Same cross-organization, Platform-Administrator-only
  // policy as GET /api/organizations/search — the Enterprise User
  // Directory reads across every user regardless of organization.
  if (url.pathname === "/api/users/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchUsers(url, deps, ctx);
  }

  const userProfileMatch = USER_PROFILE_ID_PATTERN.exec(url.pathname);
  if (userProfileMatch?.[1] && userProfileMatch[2] && request.method === "PATCH") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return updateUserProfile(userProfileMatch[1], userProfileMatch[2], request, caller, deps, ctx);
  }

  if (userProfileMatch?.[1] && userProfileMatch[2] && request.method === "DELETE") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return revokeUserProfile(userProfileMatch[1], userProfileMatch[2], caller, deps, ctx);
  }

  const userProfilesMatch = USER_PROFILES_PATTERN.exec(url.pathname);
  if (userProfilesMatch?.[1] && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return grantUserProfile(userProfilesMatch[1], request, caller, deps, ctx);
  }

  const userMatch = USER_ID_PATTERN.exec(url.pathname);
  if (userMatch?.[1] && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return getUser(userMatch[1], caller, deps, ctx);
  }

  if (url.pathname === "/api/audit" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return listAuditEvents(url, deps, ctx);
  }

  // EAP-6: the Enterprise Audit Center's filtered/paginated view over the
  // same cross-organization data GET /api/audit already reads whole — same
  // Platform-Administrator-only policy, same reasoning as every other
  // */search endpoint (Organizations, Users) sitting alongside its own
  // unfiltered list route.
  if (url.pathname === "/api/audit/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchAuditEvents(url, deps, ctx);
  }

  // EAP-6: Audit Export — the same filters as GET /api/audit/search, real
  // authorization (not just a different response shape), streamed as a
  // downloadable file rather than a paginated JSON envelope.
  if (url.pathname === "/api/audit/export" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return exportAuditEvents(url, deps, ctx);
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

/** EAP-4: every organization write/search/get route depends on
 * `deps.organizations`, unlike `listOrganizations` (EAP-1), which can stay
 * silent (an empty list) since it has always tolerated an unconfigured
 * deployment. A real deployment always wires this (`worker.ts`) — this only
 * guards the same theoretical gap `readinessResponse`'s missing
 * `readinessCheck` does. */
function organizationsNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "Organizations are not configured" },
    requestId,
    503,
  );
}

/** EAP-5: same reasoning as `organizationsNotConfigured` — every route
 * `deps.users` backs (search, get) is unusable without it, so a missing
 * dependency is a real 503, not a silently empty result. */
function usersNotConfigured(requestId: string): Response {
  return jsonError({ code: "not_configured", message: "Users are not configured" }, requestId, 503);
}

/** EAP-5: same reasoning, for `deps.userProfiles` specifically on the
 * profile-write routes (grant/change/revoke) — `resolveCaller` already
 * requires `userProfiles` to authenticate anyone at all, so in practice this
 * only guards a request that got past `resolveCaller` some other way (there
 * isn't one today), matching the same defensive-not-reachable posture
 * `readinessResponse`'s missing `readinessCheck` branch already has. */
function userProfilesNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "User profiles are not configured" },
    requestId,
    503,
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

const ASSESSMENT_SORT_FIELDS = ["createdAt", "riskScore", "framework"] as const;
// Router-local, not re-exported from @titan/assessment-core (EAP-3): purely a
// query-param validation list, the same role LEAD_SORT_FIELDS already plays
// for leads — never touches the risk engine's own scoring logic.
const ASSESSMENT_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

const ORGANIZATION_SORT_FIELDS = ["name", "createdAt", "updatedAt"] as const;

const USER_SORT_FIELDS = ["name", "email"] as const;

const AUDIT_SORT_FIELDS = ["createdAt"] as const;

// EAP-6: `GET /api/audit/export`'s hard cap — an export is a real file
// download, not a paginated UI, so there's no page/pageSize from a caller to
// bound it by. A fixed ceiling keeps one export request from attempting to
// serialize this deployment's entire audit history in a single response.
const AUDIT_EXPORT_MAX_ROWS = 10_000;

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

  // EAP-3: backs Assessment Details' "Lead linkage" panel (which leads, if
  // any, this assessment produced) — an exact match on the same
  // `LeadRecord.assessmentId` `POST /api/leads` already accepts, not a new
  // concept.
  const assessmentId = params.get("assessmentId");
  if (assessmentId) options.assessmentId = assessmentId;

  // EAP-4: backs Organization Relationships' "associated leads" panel — an
  // exact match on the same `LeadRecord.organizationId` every lead already
  // carries, not a new concept.
  const organizationId = params.get("organizationId");
  if (organizationId) options.organizationId = organizationId;

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

/** EAP-3: the Assessment Workspace's table — search/filter/sort/pagination,
 * all server-side (`AssessmentRepository.search`), same query-param
 * validation strictness as `searchLeads` (EAP-2): an unrecognized enum
 * value or non-numeric page/pageSize is a real 400, not silently ignored. */
async function searchAssessments(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const params = url.searchParams;
  const options: AssessmentSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const framework = params.get("framework");
  if (framework) options.framework = framework;

  const riskLevel = params.get("riskLevel");
  if (riskLevel !== null) {
    if (!ASSESSMENT_RISK_LEVELS.includes(riskLevel as (typeof ASSESSMENT_RISK_LEVELS)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid riskLevel: ${riskLevel}` },
        ctx.requestId,
        400,
      );
    }
    options.riskLevel = riskLevel as AssessmentSearchOptions["riskLevel"];
  }

  // EAP-4: backs Organization Relationships' "associated assessments" panel
  // — an exact match on the same `AssessmentRecord.organizationId` every
  // assessment already carries, not a new concept.
  const organizationId = params.get("organizationId");
  if (organizationId) options.organizationId = organizationId;

  // EAP-5: backs User Relationships' "assessments created by this user"
  // panel — an exact match on the same `AssessmentRecord.createdBy` every
  // assessment already carries, not a new concept.
  const createdBy = params.get("createdBy");
  if (createdBy) options.createdBy = createdBy;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (!ASSESSMENT_SORT_FIELDS.includes(sortBy as (typeof ASSESSMENT_SORT_FIELDS)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as AssessmentSearchOptions["sortBy"];
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

  const result = await withOperationTiming(ctx.metrics, "assessments.search", () =>
    deps.assessments.search(options),
  );
  return jsonSuccess(result);
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

/** EAP-4: the Organization Workspace's table — search/filter/sort/pagination,
 * all server-side (`OrganizationRepository.search`), same query-param
 * validation strictness as `searchLeads`/`searchAssessments`. Unlike
 * `listOrganizations`, a missing `deps.organizations` here is a real 503 —
 * every other route this deployment could take (list, get, create) is
 * unusable too, and staying quiet would leave a caller believing an empty
 * search result means "no organizations" rather than "not configured". */
async function searchOrganizations(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
  const params = url.searchParams;
  const options: OrganizationSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const status = params.get("status");
  if (status !== null) {
    if (!ORGANIZATION_STATUSES.includes(status as (typeof ORGANIZATION_STATUSES)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid status: ${status}` },
        ctx.requestId,
        400,
      );
    }
    options.status = status as OrganizationSearchOptions["status"];
  }

  const industry = params.get("industry");
  if (industry) options.industry = industry;

  const region = params.get("region");
  if (region) options.region = region;

  const tag = params.get("tag");
  if (tag) options.tag = tag;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (!ORGANIZATION_SORT_FIELDS.includes(sortBy as (typeof ORGANIZATION_SORT_FIELDS)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as OrganizationSearchOptions["sortBy"];
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

  const result = await withOperationTiming(ctx.metrics, "organizations.search", () =>
    deps.organizations!.search(options),
  );
  return jsonSuccess(result);
}

/** EAP-4: Organization Administration's create. Platform-Administrator-only
 * and CSRF-gated at the call site (`route`) — unlike `createLead`/
 * `createAssessment`, there is no anonymous public flow this mirrors. Checks
 * slug uniqueness explicitly (migrations/0002_organizations.sql's own
 * unique index would otherwise surface as an unhandled D1 constraint error
 * — a clean 409 is the honest, already-real constraint, not a new one). */
async function createOrganization(
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }

  const validation = validateNewOrganization(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }

  const conflict = await deps.organizations.findBySlug(validation.value.slug);
  if (conflict) {
    return jsonError(
      { code: "slug_conflict", message: "An organization with this slug already exists" },
      ctx.requestId,
      409,
    );
  }

  const saved = await withOperationTiming(ctx.metrics, "organizations.save", () =>
    deps.organizations!.save(validation.value),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: saved.id,
    action: "organization.created",
    entityType: "organization",
    entityId: saved.id,
    metadata: { name: saved.name, slug: saved.slug },
    createdAt: saved.createdAt,
  });

  return jsonSuccess(saved, 201);
}

/** EAP-4: Organization Details. Records an `organization.viewed` audit event
 * on every real read, same pattern as `getLead`/`getAssessment`. */
async function getOrganization(
  id: string,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
  const organization = await withOperationTiming(ctx.metrics, "organizations.findById", () =>
    deps.organizations!.findById(id),
  );
  if (!organization) {
    return jsonError({ code: "not_found", message: "Organization not found" }, ctx.requestId, 404);
  }

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: organization.id,
    action: "organization.viewed",
    entityType: "organization",
    entityId: organization.id,
    metadata: null,
    createdAt: new Date().toISOString(),
  });

  return jsonSuccess(organization);
}

/** EAP-4: Organization Administration's update — diffs the patch against the
 * pre-update record so only fields that actually changed produce an audit
 * event, same reasoning as `updateLead`. A `status` transition gets its own
 * named event (`organization.archived`/`organization.restored`) rather than
 * folding into `organization.updated` — the brief names archive/restore as
 * their own administrative actions, distinct from metadata edits. `note` is
 * not a field on `OrganizationRecord` at all, same as `LeadLifecyclePatch`'s
 * `note` — always just an audit event, never a mutable column. */
async function updateOrganization(
  id: string,
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const validation = validateOrganizationPatch(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }
  const { patch, note } = validation.value;

  const before = await withOperationTiming(ctx.metrics, "organizations.findById", () =>
    deps.organizations!.findById(id),
  );
  if (!before) {
    return jsonError({ code: "not_found", message: "Organization not found" }, ctx.requestId, 404);
  }

  const after = await withOperationTiming(ctx.metrics, "organizations.update", () =>
    deps.organizations!.update(id, patch),
  );
  // Can't actually be null here (before's existence was just confirmed and
  // nothing else deletes organizations) — guarded anyway per
  // OrganizationRepository.update's own contract, same as updateLead.
  if (!after) {
    return jsonError({ code: "not_found", message: "Organization not found" }, ctx.requestId, 404);
  }

  const now = new Date().toISOString();
  const metadataDiff: Record<string, { from: unknown; to: unknown }> = {};
  if (patch.name !== undefined && patch.name !== before.name) {
    metadataDiff.name = { from: before.name, to: after.name };
  }
  if (patch.industry !== undefined && patch.industry !== before.industry) {
    metadataDiff.industry = { from: before.industry, to: after.industry };
  }
  if (patch.region !== undefined && patch.region !== before.region) {
    metadataDiff.region = { from: before.region, to: after.region };
  }
  if (patch.tags !== undefined && JSON.stringify(patch.tags) !== JSON.stringify(before.tags)) {
    metadataDiff.tags = { from: before.tags, to: after.tags };
  }
  if (Object.keys(metadataDiff).length > 0) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.id,
      action: "organization.updated",
      entityType: "organization",
      entityId: id,
      metadata: metadataDiff,
      createdAt: now,
    });
  }

  if (patch.status !== undefined && patch.status !== before.status) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.id,
      action: after.status === "archived" ? "organization.archived" : "organization.restored",
      entityType: "organization",
      entityId: id,
      metadata: { from: before.status, to: after.status },
      createdAt: now,
    });
  }

  if (note) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.id,
      action: "organization.note_added",
      entityType: "organization",
      entityId: id,
      metadata: { note },
      createdAt: now,
    });
  }

  return jsonSuccess(after);
}

/** EAP-5: the User Workspace's table — search/filter/sort/pagination over
 * Auth.js's own `users` table, same query-param validation strictness as
 * `searchLeads`/`searchAssessments`/`searchOrganizations`. Unlike
 * `listOrganizations`, there is no unfiltered `GET /api/users` this mirrors
 * (see `UserRepository`'s own doc comment, types.ts, for why an unfiltered
 * list has no consumer yet) — a missing `deps.users` is therefore always a
 * real 503 here, same reasoning as `searchOrganizations`. */
async function searchUsers(url: URL, deps: Dependencies, ctx: RouteContext): Promise<Response> {
  if (!deps.users) return usersNotConfigured(ctx.requestId);
  const params = url.searchParams;
  const options: UserSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (!USER_SORT_FIELDS.includes(sortBy as (typeof USER_SORT_FIELDS)[number])) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as UserSearchOptions["sortBy"];
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

  const result = await withOperationTiming(ctx.metrics, "users.search", () =>
    deps.users!.search(options),
  );
  return jsonSuccess(result);
}

/** EAP-5: User Details — identity (`UserRecord`) composed with this user's
 * own `UserProfileRecord[]` (role/organization grants), the same
 * composition `resolveCaller`/`meResponse` already do for the *caller's
 * own* identity, now exposed for any user a Platform Administrator looks
 * up. Records a `user.viewed` audit event under `entityType: "user"`, same
 * pattern as `getLead`/`getAssessment`/`getOrganization` — findable via the
 * same `GET /api/audit?entityType=user&entityId=...` shape every other
 * detail page's audit panel already uses. `organizationId: null` on the
 * event itself: a user isn't scoped to one organization the way a lead or
 * assessment is. */
async function getUser(
  id: string,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.users) return usersNotConfigured(ctx.requestId);
  if (!deps.userProfiles) return userProfilesNotConfigured(ctx.requestId);

  const user = await withOperationTiming(ctx.metrics, "users.findById", () =>
    deps.users!.findById(id),
  );
  if (!user) {
    return jsonError({ code: "not_found", message: "User not found" }, ctx.requestId, 404);
  }

  const profiles = await withOperationTiming(ctx.metrics, "userProfiles.findByUserId", () =>
    deps.userProfiles!.findByUserId(id),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: null,
    action: "user.viewed",
    entityType: "user",
    entityId: user.id,
    metadata: null,
    createdAt: new Date().toISOString(),
  });

  return jsonSuccess({ ...user, profiles });
}

/** EAP-5: Role Assignment's grant action — creates a new `UserProfileRecord`
 * (an organization membership, or a platform-wide grant when
 * `organizationId` is null/omitted). This is the first real, self-service
 * way to grant the Platform Administrator role — previously "provisioned
 * via direct SQL only" (`OPERATIONAL_RUNBOOK.md`, `FEATURE_MATRIX.md`'s
 * not-yet-features list). Not a privilege-escalation risk: only an existing
 * Platform Administrator can reach this route at all
 * (`requirePlatformAdministrator`), and granting the same authority you
 * already hold to another real, already-authenticated person is the whole
 * point of an admin's own role-management console, not a way past it.
 * Rejects a duplicate (user, organization) grant with 409 rather than
 * letting the database's own unique index (migrations/0003) surface as an
 * unhandled constraint error — same pattern as `createOrganization`'s slug
 * check. */
async function grantUserProfile(
  userId: string,
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.users) return usersNotConfigured(ctx.requestId);
  if (!deps.userProfiles) return userProfilesNotConfigured(ctx.requestId);

  const targetUser = await deps.users.findById(userId);
  if (!targetUser) {
    return jsonError({ code: "not_found", message: "User not found" }, ctx.requestId, 404);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const validation = validateUserProfileGrant(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }
  const { organizationId, role } = validation.value;

  if (organizationId) {
    if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
    const organization = await deps.organizations.findById(organizationId);
    if (!organization) {
      return jsonError(
        { code: "not_found", message: "Organization not found" },
        ctx.requestId,
        404,
      );
    }
  }

  const existingProfiles = await deps.userProfiles.findByUserId(userId);
  const conflict = existingProfiles.find((profile) => profile.organizationId === organizationId);
  if (conflict) {
    return jsonError(
      { code: "profile_conflict", message: "This user already has a role for this organization" },
      ctx.requestId,
      409,
    );
  }

  const saved = await withOperationTiming(ctx.metrics, "userProfiles.save", () =>
    deps.userProfiles!.save({ userId, organizationId, role, createdAt: new Date().toISOString() }),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: saved.organizationId,
    action: "user.role_granted",
    entityType: "user",
    entityId: userId,
    metadata: { profileId: saved.id, organizationId: saved.organizationId, role: saved.role },
    createdAt: saved.createdAt,
  });

  return jsonSuccess(saved, 201);
}

/** EAP-5: Role Assignment's change-role action, and Administrative User
 * Lifecycle's demotion path. Validates the profile actually belongs to
 * `userId` (the URL's own path segment, not just the profile's own id)
 * before touching it — a caller can't repoint a PATCH at a profile under
 * the wrong user's URL. Guarded by `wouldRemoveLastPlatformAdministrator` —
 * see its own doc comment for why a role *change* needs the same lockout
 * guard a revoke does (demoting the last Platform Administrator away from
 * "owner" is exactly as much a lockout as removing them outright). */
async function updateUserProfile(
  userId: string,
  profileId: string,
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.userProfiles) return userProfilesNotConfigured(ctx.requestId);

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const validation = validateUserProfilePatch(body.value);
  if (!validation.ok) {
    return jsonError({ code: "validation_error", message: validation.error }, ctx.requestId, 400);
  }

  const before = await deps.userProfiles.findById(profileId);
  if (!before || before.userId !== userId) {
    return jsonError(
      { code: "not_found", message: "Role assignment not found" },
      ctx.requestId,
      404,
    );
  }

  if (validation.value.role !== before.role) {
    const wouldLockOut = await wouldRemoveLastPlatformAdministrator(
      deps.userProfiles,
      before,
      validation.value,
    );
    if (wouldLockOut) {
      return jsonError(
        {
          code: "last_platform_administrator",
          message: "Cannot change the role of the only remaining Platform Administrator",
        },
        ctx.requestId,
        409,
      );
    }
  }

  const after = await withOperationTiming(ctx.metrics, "userProfiles.update", () =>
    deps.userProfiles!.update(profileId, validation.value),
  );
  if (!after) {
    return jsonError(
      { code: "not_found", message: "Role assignment not found" },
      ctx.requestId,
      404,
    );
  }

  if (after.role !== before.role) {
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId: after.organizationId,
      action: "user.role_changed",
      entityType: "user",
      entityId: userId,
      metadata: { profileId, from: before.role, to: after.role },
      createdAt: new Date().toISOString(),
    });
  }

  return jsonSuccess(after);
}

/** EAP-5: Role Assignment's revoke action, and Administrative User
 * Lifecycle's one true deletion — `UserProfileRepository.remove` (see its
 * own doc comment, types.ts, for why this repository alone in this system
 * has a real delete). Guarded the same way `updateUserProfile`'s demotion
 * path is. The audit event is written *before* the row is removed so the
 * revoked role is still known to record — matching how `updateOrganization`
 * captures `before`'s values in its own diff before they're gone. */
async function revokeUserProfile(
  userId: string,
  profileId: string,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.userProfiles) return userProfilesNotConfigured(ctx.requestId);

  const existing = await deps.userProfiles.findById(profileId);
  if (!existing || existing.userId !== userId) {
    return jsonError(
      { code: "not_found", message: "Role assignment not found" },
      ctx.requestId,
      404,
    );
  }

  const wouldLockOut = await wouldRemoveLastPlatformAdministrator(
    deps.userProfiles,
    existing,
    null,
  );
  if (wouldLockOut) {
    return jsonError(
      {
        code: "last_platform_administrator",
        message: "Cannot remove the only remaining Platform Administrator",
      },
      ctx.requestId,
      409,
    );
  }

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: existing.organizationId,
    action: "user.role_revoked",
    entityType: "user",
    entityId: userId,
    metadata: { profileId, organizationId: existing.organizationId, role: existing.role },
    createdAt: new Date().toISOString(),
  });

  await withOperationTiming(ctx.metrics, "userProfiles.remove", () =>
    deps.userProfiles!.remove(profileId),
  );

  return jsonSuccess({ id: profileId, revoked: true });
}

/** EAP-5: prevents a Platform Administrator action from locking every
 * Platform Administrator (including the caller) out of the system — a real
 * failure mode this system has no recovery path for today (the role is
 * granted "via direct SQL only" absent this very endpoint,
 * `OPERATIONAL_RUNBOOK.md`; there is no break-glass account). `before` is
 * the profile being changed or removed; `patch` is the new role for an
 * update, or `null` for a revoke. Only matters when `before` itself is a
 * Platform Administrator profile (`organizationId: null, role: "owner"`)
 * and the change would make it stop being one — changing or removing any
 * other profile is always safe and this returns `false` immediately. */
async function wouldRemoveLastPlatformAdministrator(
  userProfiles: UserProfileRepository,
  before: UserProfileRecord,
  patch: { role: UserRole } | null,
): Promise<boolean> {
  const wasPlatformAdministrator = before.organizationId === null && before.role === "owner";
  if (!wasPlatformAdministrator) return false;

  const staysPlatformAdministrator = patch !== null && patch.role === "owner";
  if (staysPlatformAdministrator) return false;

  const allProfiles = await userProfiles.list();
  const platformAdministratorCount = allProfiles.filter(
    (profile) => profile.organizationId === null && profile.role === "owner",
  ).length;
  return platformAdministratorCount <= 1;
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

/** EAP-6: shared between `searchAuditEvents` and `exportAuditEvents` — both
 * read the exact same filter vocabulary, one paginated for the Workspace
 * table, the other capped-and-whole for a file download. Same parsing (and
 * the same validation errors for a bad sortBy/sortDirection/page/pageSize)
 * either way, not two independent copies drifting apart. */
function parseAuditSearchOptions(url: URL): ValidationResult<AuditSearchOptions> {
  const params = url.searchParams;
  const options: AuditSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const actorId = params.get("actorId");
  if (actorId) options.actorId = actorId;

  const organizationId = params.get("organizationId");
  if (organizationId) options.organizationId = organizationId;

  const action = params.get("action");
  if (action) options.action = action;

  const entityType = params.get("entityType");
  if (entityType) options.entityType = entityType;

  const entityId = params.get("entityId");
  if (entityId) options.entityId = entityId;

  const dateFrom = params.get("dateFrom");
  if (dateFrom) options.dateFrom = dateFrom;

  const dateTo = params.get("dateTo");
  if (dateTo) options.dateTo = dateTo;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (!AUDIT_SORT_FIELDS.includes(sortBy as (typeof AUDIT_SORT_FIELDS)[number])) {
      return { ok: false, error: `Invalid sortBy: ${sortBy}` };
    }
    options.sortBy = sortBy as AuditSearchOptions["sortBy"];
  }

  const sortDirection = params.get("sortDirection");
  if (sortDirection !== null) {
    if (sortDirection !== "asc" && sortDirection !== "desc") {
      return { ok: false, error: `Invalid sortDirection: ${sortDirection}` };
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
      return { ok: false, error: `Invalid ${param}: ${raw}` };
    }
    options[field] = parsed;
  }

  return ok(options);
}

async function searchAuditEvents(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const parsed = parseAuditSearchOptions(url);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }
  const result = await withOperationTiming(ctx.metrics, "audit.search", () =>
    deps.audit.search(parsed.value),
  );
  return jsonSuccess(result);
}

/** EAP-6: Audit Export. Content-Type/Content-Disposition make this a real
 * file download, not a JSON envelope — `jsonSuccess`/`jsonError` are
 * deliberately not used for the success path here (finalizeResponse.ts
 * still layers the same security headers on afterward regardless of body
 * shape, since it only ever adds headers, never replaces them). Every
 * filter is the same `parseAuditSearchOptions` `searchAuditEvents` already
 * validates — no separate, divergent parsing for the export path. */
async function exportAuditEvents(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const parsed = parseAuditSearchOptions(url);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return jsonError(
      { code: "validation_error", message: `Invalid format: ${format}` },
      ctx.requestId,
      400,
    );
  }

  const result = await withOperationTiming(ctx.metrics, "audit.export", () =>
    deps.audit.search({ ...parsed.value, page: 1, pageSize: AUDIT_EXPORT_MAX_ROWS }),
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit-export-${timestamp}.${format}`;
  const body =
    format === "csv" ? toAuditCsv(result.events) : JSON.stringify(result.events, null, 2);
  const contentType =
    format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const AUDIT_CSV_COLUMNS = [
  "id",
  "actorId",
  "organizationId",
  "action",
  "entityType",
  "entityId",
  "metadata",
  "createdAt",
] as const;

/** Standard CSV quoting (RFC 4180): a field is wrapped in double quotes,
 * with any embedded double quote doubled, whenever it contains a comma,
 * quote, or newline — the only characters that would otherwise break the
 * format. `metadata` is the one column that's a real risk of any of those
 * (it's a JSON blob), everything else here is a UUID or a fixed enum value
 * that structurally never contains them, but this doesn't special-case that
 * — a single correct helper is simpler than reasoning about which columns
 * "can't" need it. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toAuditCsv(events: AuditEventRecord[]): string {
  const header = AUDIT_CSV_COLUMNS.join(",");
  const rows = events.map((event) =>
    [
      event.id,
      event.actorId ?? "",
      event.organizationId ?? "",
      event.action,
      event.entityType,
      event.entityId ?? "",
      event.metadata ? JSON.stringify(event.metadata) : "",
      event.createdAt,
    ]
      .map((value) => csvField(value))
      .join(","),
  );
  return [header, ...rows].join("\r\n");
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

  // EAP-3: the "Assessment viewed" trail Workstream 6 asks for — same
  // pattern as getLead's lead.viewed event (EAP-2), recorded only on the
  // real success path (found + authorized), with a real actorId.
  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId: assessment.organizationId,
    action: "assessment.viewed",
    entityType: "assessment",
    entityId: assessment.id,
    metadata: null,
    createdAt: new Date().toISOString(),
  });

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

function validateNewOrganization(value: unknown): ValidationResult<NewOrganization> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  for (const field of ["name", "slug", "createdAt"] as const) {
    const result = requireNonEmptyString(record, field);
    if (!result.ok) return result;
  }

  const tags = "tags" in record ? record.tags : [];
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    return fail("tags must be an array of strings");
  }

  const newOrganization: NewOrganization = {
    name: record.name as string,
    slug: record.slug as string,
    industry: optionalNullableString(record, "industry"),
    region: optionalNullableString(record, "region"),
    tags: tags as string[],
    createdAt: record.createdAt as string,
  };

  if ("status" in record) {
    if (!ORGANIZATION_STATUSES.includes(record.status as (typeof ORGANIZATION_STATUSES)[number])) {
      return fail(`Invalid status: ${String(record.status)}`);
    }
    newOrganization.status = record.status as NewOrganization["status"];
  }

  return ok(newOrganization);
}

/** EAP-4. Every field is optional (a PATCH), but a *present* field must be
 * well-formed, same discipline as `validateLeadLifecyclePatch`.
 * `industry`/`region` distinguish "not present" (leave unchanged) from
 * "present as null" (clear it) via `in`, same reasoning as
 * `LeadLifecyclePatch.assignedTo`. */
function validateOrganizationPatch(
  value: unknown,
): ValidationResult<{ patch: OrganizationPatch; note: string | null }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  const patch: OrganizationPatch = {};

  if ("name" in record) {
    if (typeof record.name !== "string" || record.name.trim() === "") {
      return fail("name must be a non-empty string");
    }
    patch.name = record.name;
  }

  if ("status" in record) {
    if (!ORGANIZATION_STATUSES.includes(record.status as (typeof ORGANIZATION_STATUSES)[number])) {
      return fail(`Invalid status: ${String(record.status)}`);
    }
    patch.status = record.status as OrganizationPatch["status"];
  }

  if ("industry" in record) {
    if (record.industry !== null && typeof record.industry !== "string") {
      return fail("industry must be a string or null");
    }
    patch.industry = record.industry as string | null;
  }

  if ("region" in record) {
    if (record.region !== null && typeof record.region !== "string") {
      return fail("region must be a string or null");
    }
    patch.region = record.region as string | null;
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

/** EAP-5. Unlike a PATCH validator, every field here is required — there's
 * nothing pre-existing on a brand-new grant to "leave unchanged".
 * `organizationId` uses the same `optionalNullableString` helper every other
 * nullable-string field in this file's POST validators uses (`validateNewLead`'s
 * `organizationId`/`assessmentId`) — absent or explicit `null` both mean "a
 * platform-wide grant", not "leave unchanged" (there's nothing to leave). */
function validateUserProfileGrant(
  value: unknown,
): ValidationResult<{ organizationId: string | null; role: UserRole }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  if (!USER_ROLES.includes(record.role as (typeof USER_ROLES)[number])) {
    return fail(`Invalid role: ${String(record.role)}`);
  }

  return ok({
    organizationId: optionalNullableString(record, "organizationId"),
    role: record.role as UserRole,
  });
}

/** EAP-5. `role` is the only field `UserProfilePatch` has, and it's
 * required, not optional — unlike `OrganizationPatch`/`LeadLifecyclePatch`
 * (real multi-field patches where each field can be left unchanged), a
 * profile's only mutable property is its role, so a PATCH with no role to
 * set isn't a valid partial update, it's an empty one. */
function validateUserProfilePatch(value: unknown): ValidationResult<UserProfilePatch> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  if (!USER_ROLES.includes(record.role as (typeof USER_ROLES)[number])) {
    return fail(`Invalid role: ${String(record.role)}`);
  }

  return ok({ role: record.role as UserRole });
}

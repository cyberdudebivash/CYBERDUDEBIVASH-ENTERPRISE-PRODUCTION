import type { AuthConfig } from "@auth/core";
import { Auth } from "@auth/core";
import type {
  AssessmentRepository,
  AuditRepository,
  LeadRepository,
  NewAssessment,
  NewLead,
} from "./repositories/types.js";
import { jsonError, jsonSuccess } from "./http/responses.js";
import { preflightResponse, resolveAllowedOrigin } from "./http/cors.js";
import { AUTH_PAGES_CSP, finalizeResponse, STRICT_CSP } from "./http/finalizeResponse.js";
import { createLogger, type Logger } from "./observability/logger.js";
import { createInMemoryMetrics, type Metrics } from "./observability/metrics.js";
import { resolveRequestId } from "./observability/requestId.js";
import { createInMemoryRateLimiter, type RateLimiter } from "./security/rateLimiter.js";
import { isTrustedOrigin } from "./security/csrf.js";
import {
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
  const csp = url.pathname.startsWith("/api/auth/") ? AUTH_PAGES_CSP : STRICT_CSP;
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
    return listLeads(deps, ctx);
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

  const assessmentMatch = ASSESSMENT_ID_PATTERN.exec(url.pathname);
  if (assessmentMatch?.[1] && request.method === "GET") {
    return getAssessment(assessmentMatch[1], deps, ctx);
  }

  return jsonError({ code: "not_found", message: "Not found" }, ctx.requestId, 404);
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

  const saved = await withOperationTiming(ctx.metrics, "leads.save", () =>
    deps.leads.save(validation.value),
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

  const saved = await withOperationTiming(ctx.metrics, "assessments.save", () =>
    deps.assessments.save(validation.value),
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

async function getAssessment(id: string, deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const assessment = await withOperationTiming(ctx.metrics, "assessments.findById", () =>
    deps.assessments.findById(id),
  );
  if (!assessment) {
    return jsonError({ code: "not_found", message: "Assessment not found" }, ctx.requestId, 404);
  }
  return jsonSuccess(assessment);
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

import type { AuthConfig } from "@auth/core";
import { Auth } from "@auth/core";
import { buildVerifyConfirmPage } from "./auth/verifyConfirmPage.js";
import type { QuestionBank, RiskLevel } from "@titan/assessment-core";
import { dpdpV1, scoreAssessment } from "@titan/assessment-core";
import type {
  AssessmentRepository,
  AssessmentSearchOptions,
  AuditEventRecord,
  AuditRepository,
  AuditSearchOptions,
  BillingTransactionRepository,
  LeadLifecyclePatch,
  LeadPriority,
  LeadRepository,
  LeadSearchOptions,
  LeadStatus,
  LicenseRepository,
  LicenseSearchOptions,
  NewAssessment,
  NewLead,
  NewOrganization,
  OrganizationPatch,
  OrganizationRepository,
  OrganizationSearchOptions,
  OrganizationStatus,
  NewSupportRequest,
  SubscriptionRecord,
  SubscriptionRepository,
  SubscriptionSearchOptions,
  SubscriptionStatus,
  SupportRequestRepository,
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
  SUBSCRIPTION_STATUSES,
  USER_ROLES,
} from "./repositories/types.js";
import { findPlan, isSelfServicePlan, PLAN_CATALOG, type Plan } from "./commercial/planCatalog.js";
import { resolveEntitlements } from "./commercial/entitlements.js";
import {
  createRazorpayOrder,
  RazorpayApiError,
  verifyRazorpaySignature,
  type RazorpayCredentials,
} from "./commercial/razorpay.js";
import { DEFAULT_ENVIRONMENT_NAME, type ConfigValidationResult } from "./config/validateEnv.js";
import { jsonError, jsonSuccess } from "./http/responses.js";
import { preflightResponse, resolveAllowedOrigin } from "./http/cors.js";
import { authPagesCsp, finalizeResponse, STRICT_CSP } from "./http/finalizeResponse.js";
import { createLogger, type Logger } from "./observability/logger.js";
import {
  createInMemoryMetrics,
  type Metrics,
  type RecordedCount,
  type RecordedDuration,
} from "./observability/metrics.js";
import { resolveRequestId } from "./observability/requestId.js";
import {
  collectDurations,
  computeErrorRate,
  computeLatencyPercentiles,
  type ErrorRateSummary,
  type LatencyPercentiles,
} from "./observability/aggregate.js";
import { evaluateAlerts, highestSeverity, type Alert } from "./observability/alerts.js";
import { createInMemoryRateLimiter, type RateLimiter } from "./security/rateLimiter.js";
import { isTrustedOrigin } from "./security/csrf.js";
import { getSession } from "./auth/session.js";
import {
  requireAssessmentAccess,
  requireLeadsAccess,
  requirePlatformAdministrator,
} from "./auth/authorize.js";
import { countPlatformAdministrators, isPlatformAdministrator } from "./auth/rbac.js";
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
  /** CPP-1 (Customer Portal): backs Support Requests (`GET`/`POST
   * /api/portal/support`) — the one genuinely new entity the portal needs.
   * Optional for the same reason `organizations`/`users` are: an
   * unconfigured deployment fails these two routes with a 503, not a
   * silent empty result. */
  supportRequests?: SupportRequestRepository;
  /** COM-1 (Commercial Platform): backs Subscriptions (`GET`/`POST`/`PATCH
   * /api/portal/commercial/subscription`, `GET/PATCH
   * /api/commercial/subscriptions/*`) — the organization-level commercial
   * lifecycle record. Optional for the same reason `supportRequests` is: an
   * unconfigured deployment fails these specific routes with a 503, not a
   * silent empty result. */
  subscriptions?: SubscriptionRepository;
  /** COM-1: backs the seat grant tied 1:1 to a subscription (`GET
   * /api/commercial/licenses/search`, and read/updated internally
   * alongside every subscription lifecycle change). Same optionality
   * reasoning as `subscriptions`. */
  licenses?: LicenseRepository;
  /** Real Razorpay billing integration: one row per real order attempt,
   * kept separate from `subscriptions`/`licenses` (see
   * migrations/0013_billing_transactions.sql's own comment). Optional for
   * the same reason `subscriptions`/`licenses` are — an unconfigured
   * deployment fails the routes it backs with a 503, not a silent empty
   * result or (far worse, for a payment route) a silently-granted access. */
  billingTransactions?: BillingTransactionRepository;
  /** worker.ts's own `env.RAZORPAY_KEY_ID`/`env.RAZORPAY_KEY_SECRET` —
   * kept out of router.ts's own Cloudflare-binding knowledge, the same
   * boundary `readinessCheck`/`configValidation` already established (a
   * plain value in, not an `Env` import here). Optional: a deployment
   * without real Razorpay credentials fails the order-creation route with
   * a 503, the same "not configured" pattern every other optional
   * dependency in this codebase already follows — it never falls back to
   * a fake/skipped payment. */
  razorpayCredentials?: RazorpayCredentials;
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
  /** PRD-1: worker.ts's own `validateProductionConfig(env)` result, computed
   * once per request from real `env.*` bindings — kept out of router.ts's
   * own Cloudflare-binding knowledge, the same boundary `readinessCheck`
   * above already established (a plain value in, not an `Env` import here).
   * Optional so every existing test keeps working unchanged; when absent,
   * `operationsSummary` falls back to the same honest
   * "local development (never deployed)" constant it always has. */
  configValidation?: ConfigValidationResult;
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
const COMMERCIAL_SUBSCRIPTION_ID_PATTERN = /^\/api\/commercial\/subscriptions\/([^/]+)$/;

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

  // Checked before the generic /api/auth/* passthrough below — otherwise
  // Auth.js's own catch-all would swallow this path and 404 it (it has no
  // "verify-confirm" action of its own). Gated behind deps.authConfig for
  // the same reason as the rest of /api/auth/*: no auth configured means
  // this page has nothing to confirm and shouldn't exist either.
  if (url.pathname === "/api/auth/verify-confirm" && request.method === "GET" && deps.authConfig) {
    return verifyConfirmResponse(url);
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

  // EAP-7: the Enterprise Operations Center's one aggregating read —
  // per-service reachability, real request/repository-operation metrics,
  // and a static system overview. Same Platform-Administrator-only policy
  // as every other cross-cutting endpoint (Audit, Users, Organizations):
  // this composes signals from every module, so it carries the same
  // cross-organization visibility those already do.
  if (url.pathname === "/api/operations/summary" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return operationsSummary(deps, ctx);
  }

  // EAP-8: the Enterprise Reporting & Analytics Executive Dashboard's one
  // aggregating read — real counts/breakdowns computed server-side from the
  // same repositories every prior module already reads, never a client-side
  // count over a fetched-whole list. Same Platform-Administrator-only
  // policy as Audit/Operations: this composes cross-organization data from
  // every module.
  if (url.pathname === "/api/reports/summary" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return reportSummaryResponse(deps, ctx);
  }

  // EAP-8: the Analytics Workspace's one time-bucketed series per entity —
  // same authorization policy as GET /api/reports/summary.
  if (url.pathname === "/api/reports/trends" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return reportTrends(url, deps, ctx);
  }

  // EAP-8: Report Export — the same Executive Summary GET /api/reports/summary
  // returns, as a real downloadable file. Same shape and reasoning as Audit
  // Export (GET /api/audit/export): real authorization, not just a
  // different response shape.
  if (url.pathname === "/api/reports/export" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return exportReportSummary(url, deps, ctx);
  }

  // CPP-1: Enterprise Customer Portal — a real Organization Member/Admin/
  // Owner accessing their OWN organization's data, not a new role. Every
  // route below derives its organizationId server-side from the caller's
  // own real profile (never a client-supplied id, path param, or query
  // string) via resolvePortalOrganizationId, so there is no way for one
  // customer to view another organization's data by supplying a different
  // id — the exact tenant-isolation property SECURITY_GUIDE.md's own
  // known-gaps list has flagged as missing for every admin list/search
  // endpoint since EAP-1. These are new, dedicated routes rather than
  // authorization changes to the existing admin-facing endpoints
  // (GET /api/organizations/:id, GET /api/assessments/search, etc.),
  // deliberately: the admin console's own tested behavior stays untouched
  // by this phase, and a customer-scoped read is a genuinely different
  // caller/policy than a Platform-Administrator cross-organization one —
  // the same reasoning that already splits every "list" from "search" and
  // "search" from "export" elsewhere in this file.
  if (url.pathname === "/api/portal/organization" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return getPortalOrganization(organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/assessments" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return listPortalAssessments(url, organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/reports/summary" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return portalReportSummaryResponse(organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/reports/export" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return exportPortalReportSummary(url, organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/activity" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return getPortalActivity(organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/support" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return listPortalSupportRequests(caller, deps, ctx);
  }

  // CPP-1: a real authenticated write — same Origin/CSRF check every other
  // authenticated write in this file already gets (PATCH /api/leads/:id,
  // POST /api/organizations, etc.). SEC-1: also rate-limited on the same
  // general limiter POST /api/organizations already uses — a customer-
  // facing write reachable by any organization member's own session is a
  // real abuse surface (a compromised or malicious member's session could
  // spam support requests), closing a real inconsistency this codebase's
  // prior "authenticated writes never need rate limiting" reasoning had
  // (SECURITY_ARCHITECTURE.md's rate limiting section has the full
  // thresholds table).
  if (url.pathname === "/api/portal/support" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return createPortalSupportRequest(request, caller, organizationId, deps, ctx);
  }

  // COM-1: Enterprise Commercial Platform — subscriptions/licenses/
  // entitlements, built on the verified EAP-1–EAP-8 and CPP-1 foundations.
  // Provider-agnostic throughout: no route here or in any handler it calls
  // ever touches a payment amount, invoice, or card/token — this models the
  // commercial lifecycle a real billing provider would plug into, not the
  // provider itself. `GET /api/commercial/plans` is the one route open to
  // any authenticated caller (the same deliberate exception `GET /api/me`
  // already is) — plan/pricing data carries no tenant-scoped or otherwise
  // sensitive information. Every other route is either customer-scoped
  // (`/api/portal/commercial/*`, gated by the same `resolvePortalOrganizationId`
  // CPP-1 already established — never a client-supplied organization id) or
  // Platform-Administrator-only (`/api/commercial/*`, the same cross-
  // organization policy every EAP admin route already uses).
  if (url.pathname === "/api/commercial/plans" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    return commercialPlansResponse();
  }

  if (url.pathname === "/api/portal/commercial/subscription" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return getPortalCommercialSummary(organizationId, deps, ctx);
  }

  // COM-1: subscribing is a real authenticated write — same Origin/CSRF
  // check every other authenticated write in this file already gets.
  // SEC-1: rate-limited on the same general limiter as POST /api/organizations
  // and POST /api/portal/support — see that route's own comment above for
  // the reasoning (SECURITY_ARCHITECTURE.md has the full thresholds table).
  if (url.pathname === "/api/portal/commercial/subscription" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return createPortalSubscription(request, caller, organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/commercial/subscription" && request.method === "PATCH") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return updatePortalSubscription(request, caller, organizationId, deps, ctx);
  }

  // Real Razorpay billing integration, layered on top of COM-1's own
  // provider-agnostic subscription model rather than inside it (see
  // migrations/0013_billing_transactions.sql's own comment). Same
  // resolvePortalOrganizationId + CSRF discipline as every other
  // authenticated portal write above — this is real money moving, not a
  // lower-stakes route to be casually looser about.
  if (url.pathname === "/api/portal/commercial/razorpay/orders" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    // Unlike every other authenticated portal write, this one calls a real
    // third-party API (Razorpay's own /v1/orders) on every request — the
    // same "real external cost, worth rate-limiting even though the caller
    // is authenticated" reasoning POST /api/organizations already applies
    // among this file's small set of rate-limited routes; verify/scan below
    // stay unlimited like every other authenticated portal write, since
    // neither makes an outbound call of its own.
    if (!checkRateLimit(request, ctx, ctx.rateLimiter)) {
      return tooManyRequests(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return createRazorpayOrderForPlan(request, caller, organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/commercial/razorpay/verify" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return verifyRazorpayPaymentForOrganization(request, caller, organizationId, deps, ctx);
  }

  // The DPDP Compliance Scanner's own authenticated run — the first route
  // in this codebase whose authorization gate is "real Razorpay payment
  // verified", not just "organization member"/"Platform Administrator".
  // Reuses @titan/assessment-core's scoreAssessment and the existing
  // AssessmentRepository unchanged — a scan taken here shows up in the
  // Customer Portal's own pre-existing Assessments/Reports pages (CPP-1)
  // with zero new results/history/export UI needed.
  if (url.pathname === "/api/portal/dpdp-scanner/scan" && request.method === "POST") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return runPortalDpdpScan(request, caller, organizationId, deps, ctx);
  }

  if (url.pathname === "/api/portal/dpdp-scanner/access" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const organizationId = resolvePortalOrganizationId(caller, ctx.requestId);
    if (organizationId instanceof Response) return organizationId;
    return getPortalDpdpScannerAccess(organizationId, deps);
  }

  // COM-1: checked before COMMERCIAL_SUBSCRIPTION_ID_PATTERN below, or
  // "search" would be parsed as a subscription id — the same ordering every
  // other "search before :id" pair in this file already uses.
  if (url.pathname === "/api/commercial/subscriptions/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchCommercialSubscriptions(url, deps, ctx);
  }

  const subscriptionMatch = COMMERCIAL_SUBSCRIPTION_ID_PATTERN.exec(url.pathname);
  if (subscriptionMatch?.[1] && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return getCommercialSubscription(subscriptionMatch[1], deps, ctx);
  }

  if (subscriptionMatch?.[1] && request.method === "PATCH") {
    if (!isTrustedOrigin(request, ctx.allowedOrigin)) {
      return forbiddenOrigin(ctx.requestId);
    }
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return updateAdminSubscription(subscriptionMatch[1], request, caller, deps, ctx);
  }

  if (url.pathname === "/api/commercial/licenses/search" && request.method === "GET") {
    const caller = await resolveCaller(request, deps);
    if (!caller) return unauthorized(ctx.requestId);
    const denied = requirePlatformAdministrator(caller.profiles, ctx.requestId);
    if (denied) return denied;
    return searchCommercialLicenses(url, deps, ctx);
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

/** CPP-1: same reasoning as `organizationsNotConfigured` — every route
 * `deps.supportRequests` backs is unusable without it. */
function supportRequestsNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "Support requests are not configured" },
    requestId,
    503,
  );
}

/** COM-1: same reasoning as `supportRequestsNotConfigured` — every route
 * `deps.subscriptions` backs is unusable without it. */
function subscriptionsNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "Subscriptions are not configured" },
    requestId,
    503,
  );
}

/** COM-1: same reasoning, for `deps.licenses` specifically — only reachable
 * standalone via `GET /api/commercial/licenses/search`; every other license
 * read/write happens alongside an already-`deps.subscriptions`-gated
 * subscription route. */
function licensesNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "Licenses are not configured" },
    requestId,
    503,
  );
}

function billingNotConfigured(requestId: string): Response {
  return jsonError(
    { code: "not_configured", message: "Billing is not configured" },
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

/** See `auth/verifyConfirmUrl.ts`'s doc comment for why this route exists.
 * `token`/`email`/`callbackUrl` are read straight from the query string —
 * this handler never looks them up or validates them against D1, since it
 * has no side effect to protect: it only builds an href for a button. Real
 * validation happens exactly where it already did before this page
 * existed, in Auth.js's own `/api/auth/callback/email` handler once a human
 * actually clicks through. */
function verifyConfirmResponse(url: URL): Response {
  const html = buildVerifyConfirmPage({
    origin: url.origin,
    token: url.searchParams.get("token") ?? "",
    email: url.searchParams.get("email") ?? "",
    callbackUrl: url.searchParams.get("callbackUrl") ?? "",
  });
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

interface ReadinessResult {
  ready: boolean;
  /** Absent when ready — only meaningful for choosing a 503 message/log.
   * "configuration_invalid" takes priority over "database_unreachable" when
   * both are true, since a misconfigured deployment is worth surfacing on
   * its own terms rather than being masked by a generic dependency message. */
  reason?: "configuration_invalid" | "database_unreachable";
}

/** OPS-1 (Workstream 4): shared by `readinessResponse` and
 * `operationsSummary` so both report the exact same real answer to "is this
 * deployment ready to serve traffic," not two independently-drifting
 * checks. Real dependency check, not just "the process is running" — see
 * Dependencies.readinessCheck's doc comment. Absent readinessCheck (e.g. a
 * router test with no D1 wired up) reports ready:true — there is nothing to
 * fail against, matching /health's own no-dependency behavior.
 *
 * Config-validity is folded in here, not left as a fact only
 * `operationsSummary` surfaces: `validateProductionConfig` (PRD-1) already
 * treats a misconfigured `staging`/`production` deployment as broken (every
 * real cross-origin request would fail CORS, or `/api/auth/*` wouldn't
 * exist at all) — a real orchestrator honoring readiness should stop
 * routing traffic to it for the same reason it would stop routing to an
 * unreachable database. Deliberately still absent-safe: `deps
 * .configValidation` stays optional, and every existing test that never set
 * it keeps its exact prior behavior (`valid` is only ever `false` when the
 * check actually ran and actually failed). */
async function computeReadiness(deps: Dependencies, ctx: RouteContext): Promise<ReadinessResult> {
  if (deps.configValidation && !deps.configValidation.valid) {
    return { ready: false, reason: "configuration_invalid" };
  }

  if (!deps.readinessCheck) {
    return { ready: true };
  }

  try {
    const ready = await deps.readinessCheck();
    return ready ? { ready: true } : { ready: false, reason: "database_unreachable" };
  } catch (error) {
    ctx.logger.error("readiness check threw", {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ready: false, reason: "database_unreachable" };
  }
}

const READINESS_FAILURE_MESSAGES: Record<NonNullable<ReadinessResult["reason"]>, string> = {
  configuration_invalid:
    "Production configuration is invalid — see GET /api/operations/summary's configuration field for details",
  database_unreachable: "A required dependency is unreachable",
};

async function readinessResponse(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const result = await computeReadiness(deps, ctx);

  if (!result.ready) {
    return jsonError(
      {
        code: "not_ready",
        message: READINESS_FAILURE_MESSAGES[result.reason ?? "database_unreachable"],
      },
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

// COM-1:
const COMMERCIAL_SUBSCRIPTION_SORT_FIELDS = ["createdAt", "currentPeriodEnd"] as const;
const COMMERCIAL_LICENSE_SORT_FIELDS = ["createdAt", "seatLimit"] as const;

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

export interface ServiceStatus {
  name: string;
  /** Whether this deployment wires the dependency at all — mirrors
   * `Dependencies.organizations`/`.users`/`.userProfiles` being optional. */
  configured: boolean;
  /** Only meaningful when `configured` is true — a real read against the
   * repository either succeeded or threw. */
  ok: boolean;
  latencyMs?: number;
  /** The repository's own real row count (`search()`'s `total`, or
   * `list()`'s length for `userProfiles`) — not a fabricated placeholder. */
  total?: number;
  error?: string;
}

export interface SystemOverview {
  version: string;
  environment: string;
  modules: string[];
}

/** OPS-1: real aggregates computed from the exact same `ctx.metrics`
 * counters/durations `requestCounts`/`repositoryOperations` below already
 * expose raw — p50/p95/p99 latency and a 4xx/5xx rate, not fabricated,
 * derived by `observability/aggregate.ts`'s pure functions from whatever
 * this isolate has genuinely recorded since it started (resets on isolate
 * restart, the same honest limitation `requestCounts`/`repositoryOperations`
 * already have). */
export interface RequestHealthSummary {
  errorRate: ErrorRateSummary;
  latency: LatencyPercentiles;
  repositoryLatency: LatencyPercentiles;
}

export interface OperationsSummary {
  services: ServiceStatus[];
  requestCounts: RecordedCount[];
  repositoryOperations: RecordedDuration[];
  overview: SystemOverview;
  /** PRD-1: only present when `Dependencies.configValidation` is configured
   * (worker.ts always supplies it) — never fabricated for a deployment that
   * didn't actually run the check. Never includes a secret's real value,
   * only field names and honest, non-sensitive diagnostic messages (the
   * same disclosure posture `ServiceStatus.error` already established for
   * this Platform-Administrator-only endpoint). */
  configuration?: ConfigValidationResult;
  /** OPS-1: always present (unlike `configuration`) — computed from data
   * this endpoint already gathers on every call, regardless of whether a
   * deployment ever wired `configValidation`. */
  requestSummary: RequestHealthSummary;
  /** OPS-1 (Workstream 5): `observability/alerts.ts`'s `evaluateAlerts`
   * applied to this exact response's own real services/readiness/config/
   * error-rate/latency data — an empty array is a real, computed "nothing
   * is currently breaching a threshold," not the absence of a check. */
  alerts: Alert[];
}

// EAP-7: manually kept in sync with every package.json's own `version`
// field (0.1.0 across this workspace) — reading package.json at runtime
// inside a Workers bundle isn't something this codebase does anywhere
// else, so a literal checked against the real value is the honest choice
// over a fragile new import path for one display field.
const PLATFORM_VERSION = "0.1.0";

// EAP-7: real, but only ever this one value until PRD-1 — this project had
// never been deployed anywhere in any environment it had run in
// (DECISION_LOG.md's standing note, repeated every EAP/CPP/COM phase), so
// "environment" had exactly one honest answer, not a placeholder for a tier
// that didn't exist. PRD-1 introduces named `wrangler.toml` environments
// (`staging`/`production`, each setting a real `ENVIRONMENT` var) without
// touching this fallback — a deployment that doesn't configure
// `deps.configValidation` (every existing test, and any future caller that
// doesn't need this) still gets this exact same honest default.
const RUNTIME_ENVIRONMENT_FALLBACK = DEFAULT_ENVIRONMENT_NAME;

// EAP-7: every repository this Worker registers, whether or not a given
// deployment actually wires it (`ServiceStatus.configured` reports that per
// service, for the genuinely optional ones — organizations/users/
// userProfiles).
const REGISTERED_MODULES = [
  "leads",
  "assessments",
  "organizations",
  "users",
  "userProfiles",
  "audit",
] as const;

interface SearchTotal {
  search(options: { page: number; pageSize: number }): Promise<{ total: number }>;
}

/** EAP-7: a real read against the repository (page 1, pageSize 1 — the
 * cheapest possible real query, not a fabricated ping) timed through the
 * same `withOperationTiming` every other repository call in this file
 * already uses, so this contributes real samples to
 * `repositoryOperations` too, not a second, untracked timing path. Errors
 * are caught here (not left to bubble) so one unreachable service can't
 * fail the whole summary — the same "don't let one section's failure
 * block the others" principle `useDashboardData.ts`'s own `loadSection`
 * already established on the frontend. */
async function checkSearchableService(
  ctx: RouteContext,
  name: string,
  repository: SearchTotal,
): Promise<ServiceStatus> {
  const startedAt = Date.now();
  try {
    const result = await withOperationTiming(ctx.metrics, `operations.check.${name}`, () =>
      repository.search({ page: 1, pageSize: 1 }),
    );
    return {
      name,
      configured: true,
      ok: true,
      latencyMs: Date.now() - startedAt,
      total: result.total,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Same "must still be logged" discipline as `recordAuditEvent` — a
    // service-check failure must not fail the whole summary, but the real
    // cause belongs in server-side logs, not only in the response body.
    ctx.logger.error("operations service check failed", {
      requestId: ctx.requestId,
      name,
      message,
    });
    return { name, configured: true, ok: false, latencyMs: Date.now() - startedAt, error: message };
  }
}

/** `UserProfileRepository` has no `search()` — its only unfiltered,
 * count-capable method is `list()` (EAP-5's own reasoning: a guard check,
 * not a listing UI, so it never needed pagination). Same timing/error
 * handling as `checkSearchableService`, just reading a plain array's
 * length instead of a `SearchResult.total`. */
async function checkUserProfilesService(
  ctx: RouteContext,
  userProfiles: UserProfileRepository,
): Promise<ServiceStatus> {
  const startedAt = Date.now();
  try {
    const result = await withOperationTiming(ctx.metrics, "operations.check.userProfiles", () =>
      userProfiles.list(),
    );
    return {
      name: "userProfiles",
      configured: true,
      ok: true,
      latencyMs: Date.now() - startedAt,
      total: result.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.logger.error("operations service check failed", {
      requestId: ctx.requestId,
      name: "userProfiles",
      message,
    });
    return {
      name: "userProfiles",
      configured: true,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: message,
    };
  }
}

function notConfiguredService(name: string): ServiceStatus {
  return { name, configured: false, ok: false };
}

/** EAP-7: the Enterprise Operations Center's one read — per-service
 * reachability (real queries, not fabricated pings), the real request/
 * repository-operation counters `ctx.metrics` has been accumulating since
 * this isolate started (EAP-1's own Workstream 8 instrumentation, never
 * read back anywhere until now), and a static, honestly-scoped system
 * overview. No new writer anywhere — this only reads what already exists. */
async function operationsSummary(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const services = await Promise.all([
    checkSearchableService(ctx, "leads", deps.leads),
    checkSearchableService(ctx, "assessments", deps.assessments),
    deps.organizations
      ? checkSearchableService(ctx, "organizations", deps.organizations)
      : Promise.resolve(notConfiguredService("organizations")),
    deps.users
      ? checkSearchableService(ctx, "users", deps.users)
      : Promise.resolve(notConfiguredService("users")),
    deps.userProfiles
      ? checkUserProfilesService(ctx, deps.userProfiles)
      : Promise.resolve(notConfiguredService("userProfiles")),
    checkSearchableService(ctx, "audit", deps.audit),
  ]);

  const requestCounts = ctx.metrics.getCounts();
  const repositoryOperations = ctx.metrics.getDurations();
  const requestSummary: RequestHealthSummary = {
    errorRate: computeErrorRate(requestCounts, "http.request"),
    latency: computeLatencyPercentiles(
      collectDurations(repositoryOperations, "http.request.duration_ms"),
    ),
    repositoryLatency: computeLatencyPercentiles(
      collectDurations(repositoryOperations, "repository.duration_ms"),
    ),
  };

  const readiness = await computeReadiness(deps, ctx);
  const alerts = evaluateAlerts({
    ready: readiness.ready,
    services: services.map((service) => ({
      name: service.name,
      configured: service.configured,
      ok: service.ok,
    })),
    errorRate: requestSummary.errorRate,
    latency: requestSummary.latency,
    configValidation: deps.configValidation,
  });

  if (alerts.length > 0) {
    const severity = highestSeverity(alerts);
    const logAlert = severity === "critical" ? ctx.logger.error : ctx.logger.warn;
    logAlert("operational alert evaluated", {
      requestId: ctx.requestId,
      alertCount: alerts.length,
      alertIds: alerts.map((alert) => alert.id),
      severity,
    });
  }

  const summary: OperationsSummary = {
    services,
    requestCounts,
    repositoryOperations,
    overview: {
      version: PLATFORM_VERSION,
      environment: deps.configValidation?.environment ?? RUNTIME_ENVIRONMENT_FALLBACK,
      modules: [...REGISTERED_MODULES],
    },
    configuration: deps.configValidation,
    requestSummary,
    alerts,
  };

  return jsonSuccess(summary);
}

// EAP-8: this module's own fixed vocabulary for a lead/assessment's risk
// outcome — same reasoning as `DashboardPage.tsx`'s own local
// `RISK_LEVELS` constant: there is no shared, exported `RISK_LEVELS` array
// anywhere in `@titan/assessment-core` (only the `RiskLevel` type), so
// every consumer that needs to enumerate the four values keeps its own
// copy rather than inventing a new shared export for one internal helper.
const RISK_LEVELS: readonly RiskLevel[] = ["critical", "high", "medium", "low"];

/** Every key present at 0 — the starting point for `countByEnum`, and also
 * what an unconfigured `OrganizationsReport` reports on its own (there are
 * no real organizations to count when `deps.organizations` was never
 * wired, but every status is still a known, present key rather than an
 * absent one). */
function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

/** Counts `items` into a fixed, known set of `keys` — every key is present
 * in the result (starting at 0), so a caller never has to guard against a
 * missing key the way a plain `Map` would require. Used for every
 * closed-vocabulary breakdown (lead status/priority, risk level,
 * organization status) the Executive Summary reports. */
function countByEnum<T, K extends string>(
  items: T[],
  keys: readonly K[],
  keyOf: (item: T) => K,
): Record<K, number> {
  const counts = zeroCounts(keys);
  for (const item of items) counts[keyOf(item)] += 1;
  return counts;
}

/** Same idea as `countByEnum`, but for an open-ended string (e.g. an
 * assessment's `framework`, an audit event's `action`) — there is no fixed
 * set of keys to pre-seed, so only keys that actually occur appear in the
 * result. */
function countByFreeform<T>(items: T[], keyOf: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export interface OrganizationsReport {
  /** Mirrors `ServiceStatus.configured` — false when this deployment never
   * wired `deps.organizations` (EAP-4's own optional-dependency reasoning),
   * distinct from a real, honest zero. */
  configured: boolean;
  total: number;
  byStatus: Record<OrganizationStatus, number>;
}

export interface LeadsReport {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byPriority: Record<LeadPriority, number>;
  byRiskLevel: Record<RiskLevel, number>;
}

export interface AssessmentsReport {
  total: number;
  byRiskLevel: Record<RiskLevel, number>;
  /** Open-ended (only frameworks that actually occur appear) — this system
   * has exactly one framework today (`dpdp`), the same honest reasoning
   * `REGISTERED_MODULES` already applies to "what's real right now". */
  byFramework: Record<string, number>;
}

export interface IdentityReport {
  /** True only when both `deps.users` and `deps.userProfiles` are wired —
   * this report needs both (identity records and role grants), same
   * reasoning as `OrganizationsReport.configured`. */
  configured: boolean;
  totalUsers: number;
  totalProfiles: number;
  platformAdministrators: number;
}

export interface AuditActionCount {
  action: string;
  count: number;
}

export interface AuditReport {
  total: number;
  last24h: number;
  last7d: number;
  /** Highest-count actions first, capped to a handful — a full per-action
   * breakdown belongs to the Audit Center's own Investigation View, not a
   * summary card. */
  topActions: AuditActionCount[];
}

export interface ExecutiveSummary {
  organizations: OrganizationsReport;
  leads: LeadsReport;
  assessments: AssessmentsReport;
  identity: IdentityReport;
  audit: AuditReport;
  generatedAt: string;
}

const AUDIT_TOP_ACTIONS_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** EAP-8: the Enterprise Reporting & Analytics Executive Dashboard's real
 * data source — every count here comes from a real repository read
 * (`list()`/`search()`, exactly the same methods the Dashboard, Lead/
 * Assessment/Organization Workspaces, and Operations Center already call),
 * aggregated once, server-side, in this handler — never a client fetching a
 * whole list and counting it itself the way `useDashboardData.ts` does
 * today (a named, pre-existing limitation this module doesn't repeat, not
 * one it fixes retroactively — `DECISION_LOG.md`). No new repository
 * method, no new table: purely additive composition over what already
 * exists. */
async function buildExecutiveSummary(
  deps: Dependencies,
  ctx: RouteContext,
): Promise<ExecutiveSummary> {
  const [leads, assessments, organizations, auditEvents, userProfiles, usersTotal] =
    await Promise.all([
      withOperationTiming(ctx.metrics, "reports.leads.list", () => deps.leads.list()),
      withOperationTiming(ctx.metrics, "reports.assessments.list", () => deps.assessments.list()),
      deps.organizations
        ? withOperationTiming(ctx.metrics, "reports.organizations.list", () =>
            deps.organizations!.list(),
          )
        : Promise.resolve(null),
      // Same unfiltered read `listAuditEvents`/Dashboard's own audit summary
      // already perform — one fetch backs total/last24h/last7d/topActions
      // instead of four separate round trips.
      withOperationTiming(ctx.metrics, "reports.audit.list", () => deps.audit.list()),
      deps.userProfiles
        ? withOperationTiming(ctx.metrics, "reports.userProfiles.list", () =>
            deps.userProfiles!.list(),
          )
        : Promise.resolve(null),
      deps.users
        ? withOperationTiming(ctx.metrics, "reports.users.search", () =>
            deps.users!.search({ page: 1, pageSize: 1 }),
          )
        : Promise.resolve(null),
    ]);

  const now = Date.now();
  const cutoff24h = new Date(now - DAY_MS).toISOString();
  const cutoff7d = new Date(now - 7 * DAY_MS).toISOString();
  const actionCounts = countByFreeform(auditEvents, (event) => event.action);
  const topActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, AUDIT_TOP_ACTIONS_LIMIT)
    .map(([action, count]) => ({ action, count }));

  return {
    organizations: organizations
      ? {
          configured: true,
          total: organizations.length,
          byStatus: countByEnum(organizations, ORGANIZATION_STATUSES, (org) => org.status),
        }
      : {
          configured: false,
          total: 0,
          byStatus: zeroCounts(ORGANIZATION_STATUSES),
        },
    leads: {
      total: leads.length,
      byStatus: countByEnum(leads, LEAD_STATUSES, (lead) => lead.status),
      byPriority: countByEnum(leads, LEAD_PRIORITIES, (lead) => lead.priority),
      byRiskLevel: countByEnum(leads, RISK_LEVELS, (lead) => lead.result.riskLevel),
    },
    assessments: {
      total: assessments.length,
      byRiskLevel: countByEnum(
        assessments,
        RISK_LEVELS,
        (assessment) => assessment.result.riskLevel,
      ),
      byFramework: countByFreeform(assessments, (assessment) => assessment.framework),
    },
    identity: {
      configured: Boolean(deps.users && deps.userProfiles),
      totalUsers: usersTotal?.total ?? 0,
      totalProfiles: userProfiles?.length ?? 0,
      platformAdministrators: userProfiles ? countPlatformAdministrators(userProfiles) : 0,
    },
    audit: {
      total: auditEvents.length,
      last24h: auditEvents.filter((event) => event.createdAt >= cutoff24h).length,
      last7d: auditEvents.filter((event) => event.createdAt >= cutoff7d).length,
      topActions,
    },
    generatedAt: new Date(now).toISOString(),
  };
}

async function reportSummaryResponse(deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const summary = await buildExecutiveSummary(deps, ctx);
  return jsonSuccess(summary);
}

export interface TrendPoint {
  /** YYYY-MM-DD (UTC). */
  date: string;
  count: number;
}

export const REPORT_TREND_ENTITIES = [
  "leads",
  "assessments",
  "organizations",
  "audit",
  "identity",
] as const;
export type ReportTrendEntity = (typeof REPORT_TREND_ENTITIES)[number];

export interface TrendSeries {
  entity: ReportTrendEntity;
  days: number;
  points: TrendPoint[];
}

const REPORT_TREND_DEFAULT_DAYS = 30;
const REPORT_TREND_MAX_DAYS = 90;
// EAP-8: the same real-file-sized cap `AUDIT_EXPORT_MAX_ROWS` already
// establishes for a bounded read over `audit_events` — used here for the
// "audit"/"identity" trend entities, the two that read through
// `AuditRepository.search` (date-filtered) rather than an unfiltered
// `list()`.
const REPORT_TREND_MAX_SAMPLE_ROWS = 10_000;

function parseReportTrendsParams(
  url: URL,
): ValidationResult<{ entity: ReportTrendEntity; days: number }> {
  const entityParam = url.searchParams.get("entity");
  if (!entityParam || !REPORT_TREND_ENTITIES.includes(entityParam as ReportTrendEntity)) {
    return fail(`Invalid entity: ${entityParam}`);
  }

  let days = REPORT_TREND_DEFAULT_DAYS;
  const daysParam = url.searchParams.get("days");
  if (daysParam !== null) {
    const parsed = Number(daysParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > REPORT_TREND_MAX_DAYS) {
      return fail(`Invalid days: ${daysParam}`);
    }
    days = parsed;
  }

  return ok({ entity: entityParam as ReportTrendEntity, days });
}

/** Buckets a list of ISO 8601 timestamps into one count per UTC calendar
 * day over the trailing `days` days (today inclusive) — every day in the
 * window is present in the result, at 0 if nothing happened that day, so a
 * chart never has to guess whether a missing day means "zero" or "no data
 * fetched for it". */
function bucketByDay(timestamps: string[], days: number): TrendPoint[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }

  for (const timestamp of timestamps) {
    const key = timestamp.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/** EAP-8: the Analytics Workspace's one time-bucketed series per entity —
 * "Lead Trends"/"Assessment Trends"/"Organization Growth" read the same
 * unfiltered `list()` the Executive Summary and pre-existing Dashboard
 * already call, filtered here to the requested window; "Audit Volume" and
 * "Identity Activity" instead read `AuditRepository.search` with a real
 * `dateFrom` filter (unfiltered for "Audit Volume", `entityType: "user"`
 * for "Identity Activity" — the same `entityType` values `user.role_*`/
 * `user.viewed` audit events already carry, EAP-5). There is no
 * `Organization`/`Lead`/`Assessment` equivalent of a date-range filter
 * (`OrganizationSearchOptions` etc. have none), so those three read their
 * full list and filter in memory rather than inventing a new repository
 * capability for it — the same reasoning `DECISION_LOG.md`'s EAP-4 entry
 * already gave for not threading new filters into every `*SearchOptions`. */
async function reportTrends(url: URL, deps: Dependencies, ctx: RouteContext): Promise<Response> {
  const parsed = parseReportTrendsParams(url);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }
  const { entity, days } = parsed.value;
  const since = new Date(Date.now() - days * DAY_MS).toISOString();

  let timestamps: string[];
  switch (entity) {
    case "leads": {
      const leads = await withOperationTiming(ctx.metrics, "reports.trends.leads", () =>
        deps.leads.list(),
      );
      timestamps = leads.map((lead) => lead.timestamp).filter((timestamp) => timestamp >= since);
      break;
    }
    case "assessments": {
      const assessments = await withOperationTiming(ctx.metrics, "reports.trends.assessments", () =>
        deps.assessments.list(),
      );
      timestamps = assessments
        .map((assessment) => assessment.createdAt)
        .filter((timestamp) => timestamp >= since);
      break;
    }
    case "organizations": {
      if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
      const organizations = await withOperationTiming(
        ctx.metrics,
        "reports.trends.organizations",
        () => deps.organizations!.list(),
      );
      timestamps = organizations
        .map((organization) => organization.createdAt)
        .filter((timestamp) => timestamp >= since);
      break;
    }
    case "audit": {
      const result = await withOperationTiming(ctx.metrics, "reports.trends.audit", () =>
        deps.audit.search({ dateFrom: since, page: 1, pageSize: REPORT_TREND_MAX_SAMPLE_ROWS }),
      );
      timestamps = result.events.map((event) => event.createdAt);
      break;
    }
    case "identity": {
      const result = await withOperationTiming(ctx.metrics, "reports.trends.identity", () =>
        deps.audit.search({
          entityType: "user",
          dateFrom: since,
          page: 1,
          pageSize: REPORT_TREND_MAX_SAMPLE_ROWS,
        }),
      );
      timestamps = result.events.map((event) => event.createdAt);
      break;
    }
  }

  const series: TrendSeries = { entity, days, points: bucketByDay(timestamps, days) };
  return jsonSuccess(series);
}

const REPORT_SUMMARY_CSV_HEADER = ["section", "metric", "value"] as const;

/** Flattens the nested `ExecutiveSummary` into `section,metric,value` rows
 * — the same RFC 4180 quoting (`csvField`) `toAuditCsv` already uses, the
 * only reasonable tabular shape for a summary that isn't itself a list of
 * uniform records the way audit events are. */
function toExecutiveSummaryCsv(summary: ExecutiveSummary): string {
  const rows: string[][] = [
    ["organizations", "total", String(summary.organizations.total)],
    ...Object.entries(summary.organizations.byStatus).map(([status, count]) => [
      "organizations",
      `status.${status}`,
      String(count),
    ]),
    ["leads", "total", String(summary.leads.total)],
    ...Object.entries(summary.leads.byStatus).map(([status, count]) => [
      "leads",
      `status.${status}`,
      String(count),
    ]),
    ...Object.entries(summary.leads.byPriority).map(([priority, count]) => [
      "leads",
      `priority.${priority}`,
      String(count),
    ]),
    ...Object.entries(summary.leads.byRiskLevel).map(([level, count]) => [
      "leads",
      `riskLevel.${level}`,
      String(count),
    ]),
    ["assessments", "total", String(summary.assessments.total)],
    ...Object.entries(summary.assessments.byRiskLevel).map(([level, count]) => [
      "assessments",
      `riskLevel.${level}`,
      String(count),
    ]),
    ...Object.entries(summary.assessments.byFramework).map(([framework, count]) => [
      "assessments",
      `framework.${framework}`,
      String(count),
    ]),
    ["identity", "totalUsers", String(summary.identity.totalUsers)],
    ["identity", "totalProfiles", String(summary.identity.totalProfiles)],
    ["identity", "platformAdministrators", String(summary.identity.platformAdministrators)],
    ["audit", "total", String(summary.audit.total)],
    ["audit", "last24h", String(summary.audit.last24h)],
    ["audit", "last7d", String(summary.audit.last7d)],
    ...summary.audit.topActions.map((entry) => [
      "audit",
      `action.${entry.action}`,
      String(entry.count),
    ]),
  ];

  const header = REPORT_SUMMARY_CSV_HEADER.join(",");
  const csvRows = rows.map((row) => row.map(csvField).join(","));
  return [header, ...csvRows].join("\r\n");
}

/** EAP-8: Report Export — the same `ExecutiveSummary` GET /api/reports/summary
 * returns, as a real downloadable file. Same shape and reasoning as Audit
 * Export (`exportAuditEvents`): `Content-Type`/`Content-Disposition` make
 * this a real file, `finalizeResponse` still layers the same security
 * headers on afterward regardless of body shape. */
async function exportReportSummary(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return jsonError(
      { code: "validation_error", message: `Invalid format: ${format}` },
      ctx.requestId,
      400,
    );
  }

  const summary = await buildExecutiveSummary(deps, ctx);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `reporting-summary-${timestamp}.${format}`;
  const body = format === "csv" ? toExecutiveSummaryCsv(summary) : JSON.stringify(summary, null, 2);
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

// CPP-1: Enterprise Customer Portal — a real Organization Member/Admin/
// Owner viewing their own organization's data. No new role: this reuses
// the exact `user_profiles` row (a real, non-null `organizationId`) every
// existing `canAccessOrganization` check already reads.

/** Derives "my own organization" for a Customer Portal route — never a
 * client-suppliable id, always the caller's own real membership. A caller
 * with no organization membership at all (an Authenticated User with no
 * `user_profiles` row, or a Platform Administrator with only a
 * platform-wide `organizationId: null` grant) has nothing to view here —
 * a genuinely different caller shape from every existing Platform-
 * Administrator-only route, hence its own gate rather than reusing
 * `requirePlatformAdministrator`/`requireOrganizationAccess` as-is (the
 * latter already assumes the organization id comes from elsewhere, e.g. a
 * path param — here it's the very thing being resolved).
 *
 * Multi-organization membership (a user with more than one real
 * `organizationId`) resolves to the first membership found — a real,
 * named scope limit (`DECISION_LOG.md`'s CPP-1 entry), not an oversight:
 * there is no organization switcher in this phase. */
function resolvePortalOrganizationId(caller: Caller, requestId: string): string | Response {
  const membership = caller.profiles.find((profile) => profile.organizationId !== null);
  if (!membership?.organizationId) {
    return jsonError(
      {
        code: "forbidden",
        message:
          "No organization membership — the Customer Portal requires a real organization member profile",
      },
      requestId,
      403,
    );
  }
  return membership.organizationId;
}

async function getPortalOrganization(
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.organizations) return organizationsNotConfigured(ctx.requestId);
  const organization = await withOperationTiming(ctx.metrics, "portal.organizations.findById", () =>
    deps.organizations!.findById(organizationId),
  );
  if (!organization) {
    return jsonError({ code: "not_found", message: "Organization not found" }, ctx.requestId, 404);
  }
  return jsonSuccess(organization);
}

const PORTAL_PAGE_SIZE_DEFAULT = 20;
const PORTAL_PAGE_SIZE_MAX = 100;
// CPP-1: the same real-file-sized cap `AUDIT_EXPORT_MAX_ROWS`/
// `REPORT_TREND_MAX_SAMPLE_ROWS` already establish for a bounded read —
// used here to fetch "every one of this organization's own assessments"
// in one page for the Reports summary/export, since no real customer
// organization in this data model approaches this volume.
const PORTAL_ASSESSMENTS_SAMPLE_SIZE = 1000;

function parsePortalPagination(url: URL): { page: number; pageSize: number } {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    PORTAL_PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get("pageSize")) || PORTAL_PAGE_SIZE_DEFAULT),
  );
  return { page, pageSize };
}

/** The Customer Portal's own Assessment History — the same
 * `AssessmentRepository.search` the admin Assessment Workspace already
 * calls, with `organizationId` forced to the caller's own resolved
 * organization rather than accepted from the query string (unlike the
 * admin-facing `GET /api/assessments/search`, where a Platform
 * Administrator may pass any organization's id, or none). */
async function listPortalAssessments(
  url: URL,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const { page, pageSize } = parsePortalPagination(url);
  const result = await withOperationTiming(ctx.metrics, "portal.assessments.search", () =>
    deps.assessments.search({
      organizationId,
      page,
      pageSize,
      sortBy: "createdAt",
      sortDirection: "desc",
    }),
  );
  return jsonSuccess(result);
}

export interface PortalAssessmentsReport {
  total: number;
  byRiskLevel: Record<RiskLevel, number>;
  byFramework: Record<string, number>;
  /** ISO 8601, or null when this organization has no assessments yet. */
  latestAssessmentAt: string | null;
}

export interface PortalComplianceSummary {
  organizationId: string;
  assessments: PortalAssessmentsReport;
  generatedAt: string;
}

/** CPP-1's own, deliberately smaller sibling to EAP-8's `ExecutiveSummary`
 * — not the same type reused with a filter, because most of
 * `ExecutiveSummary`'s sections don't have a meaningful single-organization
 * form: leads are never associated with an organization in this data
 * model (`SECURITY_GUIDE.md`'s own note on `LeadRecord.organizationId`),
 * "identity" (Platform Administrator counts) is a platform-wide concept
 * with no per-organization analogue, and reusing "audit" as a
 * platform-wide rollup here would leak cross-tenant activity counts
 * through what looks like an organization-scoped endpoint. What *does*
 * have a real, honest per-organization form is this organization's own
 * assessments — the same real counts `buildExecutiveSummary`/
 * `ComplianceIntelligencePanel.tsx` (EAP-3, computed client-side) already
 * derive, just scoped here via the repository's own existing
 * `organizationId` filter instead of an unfiltered fetch. */
async function buildPortalComplianceSummary(
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<PortalComplianceSummary> {
  const result = await withOperationTiming(ctx.metrics, "portal.reports.assessments.search", () =>
    deps.assessments.search({
      organizationId,
      page: 1,
      pageSize: PORTAL_ASSESSMENTS_SAMPLE_SIZE,
      sortBy: "createdAt",
      sortDirection: "desc",
    }),
  );
  const assessments = result.assessments;

  return {
    organizationId,
    assessments: {
      total: assessments.length,
      byRiskLevel: countByEnum(
        assessments,
        RISK_LEVELS,
        (assessment) => assessment.result.riskLevel,
      ),
      byFramework: countByFreeform(assessments, (assessment) => assessment.framework),
      latestAssessmentAt: assessments[0]?.createdAt ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function portalReportSummaryResponse(
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const summary = await buildPortalComplianceSummary(organizationId, deps, ctx);
  return jsonSuccess(summary);
}

/** CPP-1: the same `PortalComplianceSummary` `GET /api/portal/reports/summary`
 * returns, as a real downloadable file — same shape and reasoning as
 * `exportReportSummary` (EAP-8). Contains only aggregate counts for the
 * caller's own organization, nothing individually identifying, so it needs
 * no row cap the way `GET /api/audit/export` does. */
async function exportPortalReportSummary(
  url: URL,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return jsonError(
      { code: "validation_error", message: `Invalid format: ${format}` },
      ctx.requestId,
      400,
    );
  }

  const summary = await buildPortalComplianceSummary(organizationId, deps, ctx);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `compliance-summary-${timestamp}.${format}`;
  const body =
    format === "csv" ? toPortalComplianceSummaryCsv(summary) : JSON.stringify(summary, null, 2);
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

function toPortalComplianceSummaryCsv(summary: PortalComplianceSummary): string {
  const rows: string[][] = [
    ["assessments", "total", String(summary.assessments.total)],
    ...Object.entries(summary.assessments.byRiskLevel).map(([level, count]) => [
      "assessments",
      `riskLevel.${level}`,
      String(count),
    ]),
    ...Object.entries(summary.assessments.byFramework).map(([framework, count]) => [
      "assessments",
      `framework.${framework}`,
      String(count),
    ]),
    ["assessments", "latestAssessmentAt", summary.assessments.latestAssessmentAt ?? ""],
  ];
  const header = REPORT_SUMMARY_CSV_HEADER.join(",");
  const csvRows = rows.map((row) => row.map(csvField).join(","));
  return [header, ...csvRows].join("\r\n");
}

const PORTAL_ACTIVITY_PAGE_SIZE = 20;

/** "Recent Activity"/"Notifications" on the Customer Portal Dashboard — a
 * real, organization-scoped slice of the exact same `audit_events` table
 * every admin module already writes to (`AuditRepository.search`'s
 * pre-existing `organizationId` filter, EAP-6), not a fabricated
 * notifications table with no real producer. This organization's own
 * `assessment.created`/`assessment.viewed`/`organization.*` events are
 * already recorded with a real `organizationId` (`recordAuditEvent`,
 * unchanged) — reading them back is additive, not a new writer. */
async function getPortalActivity(
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const result = await withOperationTiming(ctx.metrics, "portal.activity.search", () =>
    deps.audit.search({ organizationId, page: 1, pageSize: PORTAL_ACTIVITY_PAGE_SIZE }),
  );
  return jsonSuccess(result.events);
}

async function listPortalSupportRequests(
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.supportRequests) return supportRequestsNotConfigured(ctx.requestId);
  const requests = await withOperationTiming(ctx.metrics, "portal.supportRequests.listByUser", () =>
    deps.supportRequests!.listByUser(caller.userId),
  );
  return jsonSuccess(requests);
}

function validateSupportRequestInput(
  value: unknown,
): ValidationResult<{ subject: string; message: string }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;

  const subject = requireNonEmptyString(record, "subject");
  if (!subject.ok) return subject;
  const message = requireNonEmptyString(record, "message");
  if (!message.ok) return message;

  return ok({ subject: subject.value, message: message.value });
}

/** CPP-1's one real write: a customer submitting a support request. No
 * ticketing platform — `status` starts (and, today, stays) `"open"`; there
 * is no admin-side resolution endpoint anywhere in this codebase yet
 * (`SupportRequestStatus`'s own doc comment, `repositories/types.ts`). */
async function createPortalSupportRequest(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.supportRequests) return supportRequestsNotConfigured(ctx.requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      { code: "validation_error", message: "Invalid JSON body" },
      ctx.requestId,
      400,
    );
  }
  const parsed = validateSupportRequestInput(body);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const newRequest: NewSupportRequest = {
    organizationId,
    createdBy: caller.userId,
    subject: parsed.value.subject,
    message: parsed.value.message,
    createdAt: new Date().toISOString(),
  };
  const saved = await withOperationTiming(ctx.metrics, "portal.supportRequests.save", () =>
    deps.supportRequests!.save(newRequest),
  );
  return jsonSuccess(saved, 201);
}

// COM-1: Enterprise Commercial Platform handlers.

function commercialPlansResponse(): Response {
  return jsonSuccess(PLAN_CATALOG);
}

export interface PortalCommercialSummary {
  organizationId: string;
  subscription: {
    id: string;
    planId: string;
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
  } | null;
  plan: Plan | null;
  license: {
    id: string;
    seatLimit: number;
    status: string;
    expiresAt: string | null;
  } | null;
  seatsUsed: number;
  entitlements: ReturnType<typeof resolveEntitlements> | null;
}

/** CPP-1/COM-1: the Customer Portal's own Commercial Dashboard — one
 * composed response covering Subscription Overview, Current Plan, License
 * Summary, Usage Summary, Entitlements, Renewal Information, and Trial
 * Status all at once, the same "one endpoint composes everything a
 * dashboard needs" shape `buildPortalComplianceSummary` (CPP-1) already
 * established. An organization with no subscription yet gets an honest
 * all-null shape (never a fabricated default plan) — the same "no
 * assessments yet" idiom the rest of the Customer Portal already uses for
 * an honest empty state. */
async function getPortalCommercialSummary(
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);

  const subscription = await withOperationTiming(
    ctx.metrics,
    "portal.commercial.subscriptions.findByOrganizationId",
    () => deps.subscriptions!.findByOrganizationId(organizationId),
  );

  if (!subscription) {
    const summary: PortalCommercialSummary = {
      organizationId,
      subscription: null,
      plan: null,
      license: null,
      seatsUsed: 0,
      entitlements: null,
    };
    return jsonSuccess(summary);
  }

  const plan = findPlan(subscription.planId);
  const license = deps.licenses
    ? await withOperationTiming(
        ctx.metrics,
        "portal.commercial.licenses.findByOrganizationId",
        () => deps.licenses!.findByOrganizationId(organizationId),
      )
    : null;
  const members = await withOperationTiming(
    ctx.metrics,
    "portal.commercial.userProfiles.findByOrganizationId",
    () => deps.userProfiles!.findByOrganizationId(organizationId),
  );

  const summary: PortalCommercialSummary = {
    organizationId,
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      canceledAt: subscription.canceledAt,
    },
    plan,
    license: license
      ? {
          id: license.id,
          seatLimit: license.seatLimit,
          status: license.status,
          expiresAt: license.expiresAt,
        }
      : null,
    seatsUsed: members.length,
    entitlements: plan ? resolveEntitlements(plan, subscription) : null,
  };
  return jsonSuccess(summary);
}

function validateCreateSubscriptionInput(value: unknown): ValidationResult<{ planId: string }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const planId = requireNonEmptyString(body.value, "planId");
  if (!planId.ok) return planId;
  return ok({ planId: planId.value });
}

/** COM-1: subscribing an organization to its first plan. `POST` only —
 * once a subscription exists, every further change is a `PATCH` (upgrade/
 * downgrade/cancel/renew, `updatePortalSubscription` below), the same
 * create-once/patch-thereafter shape `POST /api/organizations`/`PATCH
 * /api/organizations/:id` already establishes. */
async function createPortalSubscription(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  if (!deps.licenses) return licensesNotConfigured(ctx.requestId);

  const existing = await deps.subscriptions.findByOrganizationId(organizationId);
  if (existing) {
    return jsonError(
      { code: "conflict", message: "This organization already has a subscription" },
      ctx.requestId,
      409,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      { code: "validation_error", message: "Invalid JSON body" },
      ctx.requestId,
      400,
    );
  }
  const parsed = validateCreateSubscriptionInput(body);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const plan = findPlan(parsed.value.planId);
  if (!plan) {
    return jsonError(
      { code: "validation_error", message: `Unknown plan: ${parsed.value.planId}` },
      ctx.requestId,
      400,
    );
  }
  // A sales-assisted plan (Plan.trialDays === 0, e.g. "enterprise") has no
  // self-service trial to start — a Platform Administrator assigns it
  // directly via PATCH /api/commercial/subscriptions/:id instead
  // (updateAdminSubscription below), which carries no such restriction.
  if (!isSelfServicePlan(plan)) {
    return jsonError(
      { code: "sales_assisted_plan", message: "This plan requires contacting sales" },
      ctx.requestId,
      400,
    );
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000).toISOString();

  const subscription = await withOperationTiming(
    ctx.metrics,
    "portal.commercial.subscriptions.save",
    () =>
      deps.subscriptions!.save({
        organizationId,
        planId: plan.id,
        status: "trialing",
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
        createdAt: now.toISOString(),
      }),
  );
  const license = await withOperationTiming(ctx.metrics, "portal.commercial.licenses.save", () =>
    deps.licenses!.save({
      organizationId,
      subscriptionId: subscription.id,
      seatLimit: plan.entitlements.maxSeats,
      status: "active",
      activatedAt: now.toISOString(),
      expiresAt: null,
      createdAt: now.toISOString(),
    }),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId,
    action: "subscription.created",
    entityType: "subscription",
    entityId: subscription.id,
    metadata: { planId: plan.id },
    createdAt: now.toISOString(),
  });
  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId,
    action: "license.activated",
    entityType: "license",
    entityId: license.id,
    metadata: { seatLimit: license.seatLimit },
    createdAt: now.toISOString(),
  });

  return jsonSuccess({ subscription, license }, 201);
}

interface SubscriptionPatchInput {
  planId?: string;
  status?: SubscriptionStatus;
}

/** COM-1: a customer's own self-service lifecycle actions — narrower than
 * what a Platform Administrator may do (`validateAdminSubscriptionPatch`
 * below): only a plan change (upgrade/downgrade) or a `"canceled"`/
 * `"active"` status transition (cancel/renew). A customer can never set
 * `"trialing"`/`"expired"` directly, or edit `trialEndsAt`/
 * `currentPeriodEnd` themselves — those are server-derived, the same
 * "never trust a client value for a business date/status" discipline
 * `POST /api/leads`'s server-side score recomputation already
 * established. */
function validatePortalSubscriptionPatch(value: unknown): ValidationResult<SubscriptionPatchInput> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;
  const result: SubscriptionPatchInput = {};

  if (record.planId !== undefined) {
    if (typeof record.planId !== "string" || record.planId.trim() === "") {
      return fail("Invalid field: planId");
    }
    result.planId = record.planId;
  }
  if (record.status !== undefined) {
    if (record.status !== "canceled" && record.status !== "active") {
      return fail('Invalid field: status must be "canceled" or "active"');
    }
    result.status = record.status;
  }
  if (result.planId === undefined && result.status === undefined) {
    return fail("Body must include planId and/or status");
  }
  return ok(result);
}

/** COM-1: a Platform Administrator's override — any known plan (including a
 * sales-assisted one like "enterprise", the real, intended way that plan
 * gets assigned to a real customer) and any real `SubscriptionStatus`, not
 * just the two a customer may self-serve. No broader than that: a Platform
 * Administrator still can't set an unknown plan id or an arbitrary status
 * string, the same "known values only, never free text" discipline every
 * other admin PATCH in this file already applies. */
function validateAdminSubscriptionPatch(value: unknown): ValidationResult<SubscriptionPatchInput> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const record = body.value;
  const result: SubscriptionPatchInput = {};

  if (record.planId !== undefined) {
    if (typeof record.planId !== "string" || record.planId.trim() === "") {
      return fail("Invalid field: planId");
    }
    result.planId = record.planId;
  }
  if (record.status !== undefined) {
    if (!SUBSCRIPTION_STATUSES.includes(record.status as SubscriptionStatus)) {
      return fail(`Invalid status: ${String(record.status)}`);
    }
    result.status = record.status as SubscriptionStatus;
  }
  if (result.planId === undefined && result.status === undefined) {
    return fail("Body must include planId and/or status");
  }
  return ok(result);
}

/** COM-1: the one shared state-machine both the customer-facing PATCH
 * (`updatePortalSubscription`) and the admin override PATCH
 * (`updateAdminSubscription`) apply, after each has validated the patch
 * against its own, differently-scoped rules — real audit events derived
 * from what actually changed, the same diff-before-recording discipline
 * `updateOrganization`/`updateLead` already established, extended here to
 * also keep the subscription's own `LicenseRecord` (seat limit, active/
 * expired status) in lockstep rather than letting the two drift apart. */
async function applySubscriptionPatch(
  organizationId: string,
  before: SubscriptionRecord,
  patch: SubscriptionPatchInput,
  actorId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<SubscriptionRecord> {
  let after = before;
  const now = new Date().toISOString();

  if (patch.planId && patch.planId !== after.planId) {
    const oldPlan = findPlan(after.planId);
    const newPlan = findPlan(patch.planId);
    if (newPlan) {
      const updated = await deps.subscriptions!.update(after.id, { planId: newPlan.id });
      if (updated) after = updated;
      const action =
        !oldPlan || newPlan.tier > oldPlan.tier
          ? "subscription.upgraded"
          : "subscription.downgraded";
      await recordAuditEvent(deps, ctx, {
        actorId,
        organizationId,
        action,
        entityType: "subscription",
        entityId: before.id,
        metadata: { from: before.planId, to: newPlan.id },
        createdAt: now,
      });
      const license = deps.licenses
        ? await deps.licenses.findByOrganizationId(organizationId)
        : null;
      if (license) {
        await deps.licenses!.update(license.id, { seatLimit: newPlan.entitlements.maxSeats });
      }
    }
  }

  if (patch.status === "canceled" && after.status !== "canceled") {
    const updated = await deps.subscriptions!.update(after.id, {
      status: "canceled",
      canceledAt: now,
    });
    if (updated) after = updated;
    await recordAuditEvent(deps, ctx, {
      actorId,
      organizationId,
      action: "subscription.canceled",
      entityType: "subscription",
      entityId: before.id,
      metadata: null,
      createdAt: now,
    });
    const license = deps.licenses ? await deps.licenses.findByOrganizationId(organizationId) : null;
    if (license && license.status !== "expired") {
      await deps.licenses!.update(license.id, { status: "expired" });
      await recordAuditEvent(deps, ctx, {
        actorId,
        organizationId,
        action: "license.expired",
        entityType: "license",
        entityId: license.id,
        metadata: null,
        createdAt: now,
      });
    }
  }

  if (patch.status === "active" && (after.status === "canceled" || after.status === "expired")) {
    // Server-computed, never client-supplied — the same discipline
    // createLead/createAssessment's server-side recomputation established.
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await deps.subscriptions!.update(after.id, {
      status: "active",
      currentPeriodEnd,
      canceledAt: null,
    });
    if (updated) after = updated;
    await recordAuditEvent(deps, ctx, {
      actorId,
      organizationId,
      action: "subscription.renewed",
      entityType: "subscription",
      entityId: before.id,
      metadata: null,
      createdAt: now,
    });
    const license = deps.licenses ? await deps.licenses.findByOrganizationId(organizationId) : null;
    if (license && license.status !== "active") {
      await deps.licenses!.update(license.id, { status: "active" });
      await recordAuditEvent(deps, ctx, {
        actorId,
        organizationId,
        action: "license.activated",
        entityType: "license",
        entityId: license.id,
        metadata: null,
        createdAt: now,
      });
    }
  }

  return after;
}

async function updatePortalSubscription(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  const before = await deps.subscriptions.findByOrganizationId(organizationId);
  if (!before) {
    return jsonError(
      { code: "not_found", message: "No subscription exists for this organization" },
      ctx.requestId,
      404,
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const parsed = validatePortalSubscriptionPatch(body.value);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }
  if (parsed.value.planId) {
    const plan = findPlan(parsed.value.planId);
    if (!plan) {
      return jsonError(
        { code: "validation_error", message: `Unknown plan: ${parsed.value.planId}` },
        ctx.requestId,
        400,
      );
    }
    if (!isSelfServicePlan(plan)) {
      return jsonError(
        { code: "sales_assisted_plan", message: "This plan requires contacting sales" },
        ctx.requestId,
        400,
      );
    }
  }

  const after = await applySubscriptionPatch(
    organizationId,
    before,
    parsed.value,
    caller.userId,
    deps,
    ctx,
  );
  return jsonSuccess(after);
}

// Real Razorpay billing integration. Deliberately not folded into
// applySubscriptionPatch above: that state machine's "active" transition
// only ever means "renewed from canceled/expired" (a free, self-service
// action) — it has no transition for "a trial converts to a real paid
// subscription because a payment was just verified", a genuinely different
// event this codebase never modeled before real payments existed. Keeping
// this as its own function means applySubscriptionPatch's existing,
// already-tested state machine is untouched — zero risk of a payment path
// silently changing free cancel/renew behavior, or vice versa.

function validateCreateRazorpayOrderInput(value: unknown): ValidationResult<{ planId: string }> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const planId = requireNonEmptyString(body.value, "planId");
  if (!planId.ok) return planId;
  return ok({ planId: planId.value });
}

/** Creates a real Razorpay order for a self-service plan's real,
 * server-resolved price — the client chooses a `planId`, never an amount.
 * If the organization has no subscription yet, one is created here in
 * `"trialing"` status (the same shape `createPortalSubscription` already
 * creates for the free self-service path) purely to have a real id to
 * attach this transaction to; it only becomes `"active"` once the payment
 * this order represents is actually verified (`verifyRazorpayPaymentForOrganization`
 * below) — creating the order is not itself an access grant. */
async function createRazorpayOrderForPlan(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.billingTransactions) return billingNotConfigured(ctx.requestId);
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  if (!deps.licenses) return licensesNotConfigured(ctx.requestId);
  if (!deps.razorpayCredentials) return billingNotConfigured(ctx.requestId);

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const parsed = validateCreateRazorpayOrderInput(body.value);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const plan = findPlan(parsed.value.planId);
  if (!plan) {
    return jsonError(
      { code: "validation_error", message: `Unknown plan: ${parsed.value.planId}` },
      ctx.requestId,
      400,
    );
  }
  // Enterprise (trialDays: 0, priceInPaise: null) is sales-assisted by
  // design (planCatalog.ts) — no self-service checkout amount exists for
  // it, the identical restriction createPortalSubscription already applies
  // to the free trial path.
  if (!isSelfServicePlan(plan) || plan.priceInPaise === null) {
    return jsonError(
      { code: "sales_assisted_plan", message: "This plan requires contacting sales" },
      ctx.requestId,
      400,
    );
  }

  const now = new Date();
  let subscription = await deps.subscriptions.findByOrganizationId(organizationId);
  if (!subscription) {
    const trialEndsAt = new Date(
      now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    subscription = await withOperationTiming(
      ctx.metrics,
      "portal.commercial.razorpay.subscriptions.save",
      () =>
        deps.subscriptions!.save({
          organizationId,
          planId: plan.id,
          status: "trialing",
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
          createdAt: now.toISOString(),
        }),
    );
    await deps.licenses.save({
      organizationId,
      subscriptionId: subscription.id,
      seatLimit: plan.entitlements.maxSeats,
      status: "active",
      activatedAt: now.toISOString(),
      expiresAt: null,
      createdAt: now.toISOString(),
    });
  }

  let order;
  try {
    order = await createRazorpayOrder(
      {
        amountPaise: plan.priceInPaise,
        currency: "INR",
        // Razorpay's own receipt field is an opaque merchant reference, capped
        // at 40 characters — real, not fabricated, and never used to derive
        // anything security-relevant (the real link back to this organization
        // is billing_transactions.organization_id, resolved server-side).
        receipt: `${organizationId}-${plan.id}`.slice(0, 40),
      },
      deps.razorpayCredentials,
    );
  } catch (error) {
    const message =
      error instanceof RazorpayApiError ? error.message : "Razorpay order creation failed";
    return jsonError({ code: "razorpay_error", message }, ctx.requestId, 502);
  }

  const transaction = await deps.billingTransactions.save({
    organizationId,
    subscriptionId: subscription.id,
    planId: plan.id,
    provider: "razorpay",
    providerOrderId: order.id,
    providerPaymentId: null,
    providerSignature: null,
    amountPaise: plan.priceInPaise,
    currency: "INR",
    status: "created",
    createdAt: now.toISOString(),
  });

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId,
    action: "billing.order_created",
    entityType: "subscription",
    entityId: subscription.id,
    metadata: { planId: plan.id, amountPaise: plan.priceInPaise, providerOrderId: order.id },
    createdAt: now.toISOString(),
  });

  return jsonSuccess(
    {
      orderId: order.id,
      amountPaise: plan.priceInPaise,
      currency: "INR",
      // The key id is meant to be public — Razorpay's own Checkout widget
      // requires it client-side to open. Never the key secret.
      keyId: deps.razorpayCredentials.keyId,
      transactionId: transaction.id,
    },
    201,
  );
}

function validateVerifyRazorpayPaymentInput(value: unknown): ValidationResult<{
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const orderId = requireNonEmptyString(body.value, "razorpay_order_id");
  if (!orderId.ok) return orderId;
  const paymentId = requireNonEmptyString(body.value, "razorpay_payment_id");
  if (!paymentId.ok) return paymentId;
  const signature = requireNonEmptyString(body.value, "razorpay_signature");
  if (!signature.ok) return signature;
  return ok({
    razorpayOrderId: orderId.value,
    razorpayPaymentId: paymentId.value,
    razorpaySignature: signature.value,
  });
}

/** The one function that actually grants paid access — everything before
 * this point (order creation, opening Razorpay's Checkout widget) is
 * real but not itself trusted; access is granted only after this route
 * independently recomputes the HMAC signature server-side and confirms it
 * matches (`verifyRazorpaySignature`, `commercial/razorpay.ts`), never on
 * the client's own claim that checkout succeeded. */
async function verifyRazorpayPaymentForOrganization(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.billingTransactions) return billingNotConfigured(ctx.requestId);
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  if (!deps.licenses) return licensesNotConfigured(ctx.requestId);
  if (!deps.razorpayCredentials) return billingNotConfigured(ctx.requestId);

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const parsed = validateVerifyRazorpayPaymentInput(body.value);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const transaction = await deps.billingTransactions.findByProviderOrderId(
    parsed.value.razorpayOrderId,
  );
  // Scoped to the caller's own organization before anything else — an
  // order id belonging to a different organization is treated exactly
  // like an order id that doesn't exist at all, never distinguished by a
  // different status code (SECURITY_GUIDE.md's own "don't leak existence"
  // reasoning, applied here to a real payment record instead of an
  // admin one).
  if (!transaction || transaction.organizationId !== organizationId) {
    return jsonError({ code: "not_found", message: "Order not found" }, ctx.requestId, 404);
  }

  // Idempotent: a retried verify call (e.g. the browser tab closing and
  // reopening mid-flow) for an already-verified order returns the same
  // real success, not a second charge or a spurious error.
  if (transaction.status === "paid") {
    return jsonSuccess({ verified: true, transactionId: transaction.id });
  }

  const signatureValid = await verifyRazorpaySignature(
    parsed.value.razorpayOrderId,
    parsed.value.razorpayPaymentId,
    parsed.value.razorpaySignature,
    deps.razorpayCredentials.keySecret,
  );

  const now = new Date().toISOString();

  if (!signatureValid) {
    await deps.billingTransactions.update(transaction.id, { status: "failed" });
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId,
      action: "billing.payment_failed",
      entityType: "subscription",
      entityId: transaction.subscriptionId,
      metadata: { providerOrderId: transaction.providerOrderId, reason: "signature_mismatch" },
      createdAt: now,
    });
    return jsonError(
      { code: "signature_verification_failed", message: "Payment could not be verified" },
      ctx.requestId,
      400,
    );
  }

  await deps.billingTransactions.update(transaction.id, {
    status: "paid",
    providerPaymentId: parsed.value.razorpayPaymentId,
    providerSignature: parsed.value.razorpaySignature,
  });

  const plan = findPlan(transaction.planId);
  const subscription = await deps.subscriptions.findById(transaction.subscriptionId);
  if (plan && subscription) {
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await deps.subscriptions.update(subscription.id, {
      planId: plan.id,
      status: "active",
      currentPeriodEnd,
    });
    const license = await deps.licenses.findByOrganizationId(organizationId);
    if (license) {
      await deps.licenses.update(license.id, {
        seatLimit: plan.entitlements.maxSeats,
        status: "active",
      });
    }
    await recordAuditEvent(deps, ctx, {
      actorId: caller.userId,
      organizationId,
      action: "subscription.activated",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { planId: plan.id, providerOrderId: transaction.providerOrderId },
      createdAt: now,
    });
  }

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId,
    action: "billing.payment_verified",
    entityType: "subscription",
    entityId: transaction.subscriptionId,
    metadata: {
      providerOrderId: transaction.providerOrderId,
      amountPaise: transaction.amountPaise,
    },
    createdAt: now,
  });

  return jsonSuccess({ verified: true, transactionId: transaction.id });
}

/** The DPDP Compliance Scanner's real access gate — deliberately not the
 * same thing as `resolveEntitlements`'s output. Entitlements grant their
 * full plan during `"trialing"` (a real, intended trial-evaluation
 * feature, `entitlements.ts`'s own doc comment) which would let a
 * never-paid organization run the scanner for free — the opposite of
 * "payment must complete before any scan can start". This checks for a
 * real, verified `"paid"` transaction directly, independent of trial
 * status, and additionally requires the subscription to currently be
 * `"active"` (a canceled paid subscription loses access, matching ordinary
 * SaaS expectations) — see DECISION_LOG.md's entry for the full reasoning
 * on why this is a separate check from entitlements rather than a new
 * PlanEntitlements field. */
async function hasVerifiedDpdpScannerAccess(
  organizationId: string,
  deps: Dependencies,
): Promise<boolean> {
  if (!deps.billingTransactions || !deps.subscriptions) return false;
  const subscription = await deps.subscriptions.findByOrganizationId(organizationId);
  if (!subscription || subscription.status !== "active") return false;
  const paid = await deps.billingTransactions.search({
    organizationId,
    status: "paid",
    pageSize: 1,
  });
  return paid.total > 0;
}

async function getPortalDpdpScannerAccess(
  organizationId: string,
  deps: Dependencies,
): Promise<Response> {
  const hasAccess = await hasVerifiedDpdpScannerAccess(organizationId, deps);
  return jsonSuccess({ hasAccess });
}

function validateDpdpScanInput(value: unknown): ValidationResult<NewAssessment["answers"]> {
  const body = requireJsonObject(value, "Body");
  if (!body.ok) return body;
  const answers = requirePlainObject(body.value, "answers");
  if (!answers.ok) return answers;
  return ok(answers.value as unknown as NewAssessment["answers"]);
}

/** The scanner's own real run — gated on `hasVerifiedDpdpScannerAccess`
 * above, otherwise identical to the public, anonymous `createAssessment`:
 * the exact same `scoreAssessment(dpdpV1.questions, answers)` and the same
 * `AssessmentRepository.save`, just with a real `organizationId`/`createdBy`
 * instead of the anonymous flow's null/lead-derived values. The saved
 * assessment is not a new kind of record — it shows up in the Customer
 * Portal's own pre-existing Assessments/Reports pages (CPP-1) exactly like
 * any other assessment linked to this organization, with zero new
 * results/history/search/export UI needed. */
async function runPortalDpdpScan(
  request: Request,
  caller: Caller,
  organizationId: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  const hasAccess = await hasVerifiedDpdpScannerAccess(organizationId, deps);
  if (!hasAccess) {
    return jsonError(
      {
        code: "payment_required",
        message: "A paid subscription is required to run the DPDP Compliance Scanner",
      },
      ctx.requestId,
      402,
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const parsed = validateDpdpScanInput(body.value);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }

  const result = scoreAssessment(dpdpV1.questions, parsed.value);
  const saved = await withOperationTiming(ctx.metrics, "portal.dpdpScanner.assessments.save", () =>
    deps.assessments.save({
      organizationId,
      createdBy: caller.userId,
      framework: "dpdp",
      frameworkVersion: dpdpV1.version,
      answers: parsed.value,
      result,
      createdAt: new Date().toISOString(),
    }),
  );

  await recordAuditEvent(deps, ctx, {
    actorId: caller.userId,
    organizationId,
    action: "assessment.created",
    entityType: "assessment",
    entityId: saved.id,
    metadata: { framework: saved.framework, frameworkVersion: saved.frameworkVersion },
    createdAt: saved.createdAt,
  });

  return jsonSuccess(saved, 201);
}

async function updateAdminSubscription(
  id: string,
  request: Request,
  caller: Caller,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  const before = await deps.subscriptions.findById(id);
  if (!before) {
    return jsonError({ code: "not_found", message: "Subscription not found" }, ctx.requestId, 404);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError({ code: "invalid_body", message: body.error }, ctx.requestId, 400);
  }
  const parsed = validateAdminSubscriptionPatch(body.value);
  if (!parsed.ok) {
    return jsonError({ code: "validation_error", message: parsed.error }, ctx.requestId, 400);
  }
  if (parsed.value.planId && !findPlan(parsed.value.planId)) {
    return jsonError(
      { code: "validation_error", message: `Unknown plan: ${parsed.value.planId}` },
      ctx.requestId,
      400,
    );
  }

  const after = await applySubscriptionPatch(
    before.organizationId,
    before,
    parsed.value,
    caller.userId,
    deps,
    ctx,
  );
  return jsonSuccess(after);
}

/** COM-1: the Commercial Workspace's table — search/filter/sort/pagination,
 * the same query-param validation strictness as every other `/search`
 * endpoint in this file. Platform-Administrator-only for the identical
 * repository-isolation reason every other cross-organization search
 * already is (`SubscriptionRepository.search` has no per-organization
 * filter — it returns every organization's own subscription). */
async function searchCommercialSubscriptions(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  const params = url.searchParams;
  const options: SubscriptionSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const status = params.get("status");
  if (status !== null) {
    if (!SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus)) {
      return jsonError(
        { code: "validation_error", message: `Invalid status: ${status}` },
        ctx.requestId,
        400,
      );
    }
    options.status = status as SubscriptionStatus;
  }

  const planId = params.get("planId");
  if (planId) options.planId = planId;

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (
      !COMMERCIAL_SUBSCRIPTION_SORT_FIELDS.includes(
        sortBy as (typeof COMMERCIAL_SUBSCRIPTION_SORT_FIELDS)[number],
      )
    ) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as SubscriptionSearchOptions["sortBy"];
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

  const result = await withOperationTiming(ctx.metrics, "commercial.subscriptions.search", () =>
    deps.subscriptions!.search(options),
  );
  return jsonSuccess(result);
}

/** COM-1: Subscription Administration's detail view — the subscription
 * joined server-side with its resolved plan and license, the same
 * "compose the related records into one response" shape
 * `getPortalCommercialSummary` above already uses for the customer-facing
 * equivalent. */
async function getCommercialSubscription(
  id: string,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.subscriptions) return subscriptionsNotConfigured(ctx.requestId);
  const subscription = await withOperationTiming(
    ctx.metrics,
    "commercial.subscriptions.findById",
    () => deps.subscriptions!.findById(id),
  );
  if (!subscription) {
    return jsonError({ code: "not_found", message: "Subscription not found" }, ctx.requestId, 404);
  }
  const plan = findPlan(subscription.planId);
  const license = deps.licenses
    ? await deps.licenses.findByOrganizationId(subscription.organizationId)
    : null;
  // Same real, live count `getPortalCommercialSummary` uses — an admin
  // reviewing one organization's own subscription needs the identical
  // "how many seats are actually in use" fact a customer sees.
  const seatsUsed = deps.userProfiles
    ? (await deps.userProfiles.findByOrganizationId(subscription.organizationId)).length
    : 0;
  return jsonSuccess({ subscription, plan, license, seatsUsed });
}

async function searchCommercialLicenses(
  url: URL,
  deps: Dependencies,
  ctx: RouteContext,
): Promise<Response> {
  if (!deps.licenses) return licensesNotConfigured(ctx.requestId);
  const params = url.searchParams;
  const options: LicenseSearchOptions = {};

  const search = params.get("search");
  if (search) options.search = search;

  const status = params.get("status");
  if (status !== null) {
    if (status !== "active" && status !== "expired") {
      return jsonError(
        { code: "validation_error", message: `Invalid status: ${status}` },
        ctx.requestId,
        400,
      );
    }
    options.status = status;
  }

  const sortBy = params.get("sortBy");
  if (sortBy !== null) {
    if (
      !COMMERCIAL_LICENSE_SORT_FIELDS.includes(
        sortBy as (typeof COMMERCIAL_LICENSE_SORT_FIELDS)[number],
      )
    ) {
      return jsonError(
        { code: "validation_error", message: `Invalid sortBy: ${sortBy}` },
        ctx.requestId,
        400,
      );
    }
    options.sortBy = sortBy as LicenseSearchOptions["sortBy"];
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

  const result = await withOperationTiming(ctx.metrics, "commercial.licenses.search", () =>
    deps.licenses!.search(options),
  );
  return jsonSuccess(result);
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

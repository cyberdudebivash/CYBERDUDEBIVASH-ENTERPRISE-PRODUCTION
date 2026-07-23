import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { createAuthConfig } from "./auth/config.js";
import { createD1AssessmentRepository } from "./repositories/assessmentRepository.d1.js";
import { createD1AuditRepository } from "./repositories/auditRepository.d1.js";
import { createD1LeadRepository } from "./repositories/leadRepository.d1.js";
import { createD1OrganizationRepository } from "./repositories/organizationRepository.d1.js";
import { createD1UserProfileRepository } from "./repositories/userProfileRepository.d1.js";
import { createD1UserRepository } from "./repositories/userRepository.d1.js";
import { createD1SupportRequestRepository } from "./repositories/supportRequestRepository.d1.js";
import { createD1SubscriptionRepository } from "./repositories/subscriptionRepository.d1.js";
import { createD1LicenseRepository } from "./repositories/licenseRepository.d1.js";
import { createD1BillingTransactionRepository } from "./repositories/billingTransactionRepository.d1.js";
import { createD1WebhookEventRepository } from "./repositories/webhookEventRepository.d1.js";
import { handleRequest, runSubscriptionExpirySweep } from "./router.js";
import { resolveAllowedOrigin } from "./http/cors.js";
import { createLogger } from "./observability/logger.js";
import { createInMemoryMetrics } from "./observability/metrics.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";
import { validateProductionConfig } from "./config/validateEnv.js";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_GITHUB_ID?: string;
  AUTH_GITHUB_SECRET?: string;
  /** PRD-1: set per named `wrangler.toml` environment (`[env.staging]`'s and
   * [env.production]'s own `[vars]` blocks) — absent in local dev, matching
   * every other var here. Read by `validateProductionConfig` below and
   * surfaced honestly via `GET /api/operations/summary`'s `overview.environment`
   * and new `configuration` field, never guessed from any other signal. */
  ENVIRONMENT?: string;
  /** Real Razorpay credentials — absent in local dev and in every
   * environment this project has ever actually run in (DECISION_LOG.md).
   * Both must be present for `razorpayCredentials` to be constructed below;
   * a partial pair (e.g. key id alone) is treated as not configured, same
   * as `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`'s own pairing below. */
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  /** Real recurring billing: Razorpay's own dedicated webhook secret — a
   * *different* value from `RAZORPAY_KEY_SECRET` (Razorpay issues one per
   * configured webhook endpoint, per its own documented contract). Absent
   * in local dev and in every environment this project has ever actually
   * run in, same as `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. */
  RAZORPAY_WEBHOOK_SECRET?: string;
  /** Real Resend credentials for production magic-link email
   * (auth/resendEmail.ts) — absent in local dev, same
   * blocked-without-both-values shape Razorpay above already established.
   * Both must be present for `createAuthConfig`'s `resend` option to be
   * constructed below; a partial pair is treated as not configured and
   * falls back to the dev-mode logging provider, same pairing rule as
   * `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. `EMAIL_FROM` must be an
   * address on a domain verified in the Resend dashboard — never defaulted
   * to a guessed address here (Resend rejects unverified senders, and which
   * domain is verified on this account is real information this codebase
   * cannot know on its own — see DECISION_LOG.md's same-day correction). */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

// Module-scoped (not per-request): a Workers isolate is reused across many
// requests during its lifetime, so the rate limiter's counters and the
// logger's base fields persist the way they're meant to for the isolate's
// duration. See security/rateLimiter.ts for why this is a real limiter but
// only a per-isolate one, not a global production control.
const logger = createLogger({ service: "titan-platform" });
const rateLimiter = createInMemoryRateLimiter({ limit: 30, windowMs: 60_000 });
const authRateLimiter = createInMemoryRateLimiter({ limit: 10, windowMs: 60_000 });
const metrics = createInMemoryMetrics();

// PRD-1: logged at most once per isolate (Workers has no separate startup
// hook to fail at — env bindings only exist inside fetch(), see
// config/validateEnv.ts's own doc comment) rather than once per request,
// which would otherwise flood logs for every request a misconfigured
// deployment ever receives.
let configWarningLogged = false;

// Deployed to production (titan-platform-production, 2026-07-23 —
// DECISION_LOG.md) and to a local `wrangler dev` + real local D1 instance
// throughout development (Workstream 10 — local operational verification),
// not verified against fakes alone.
export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // One resolved value feeds both CORS and Auth.js's redirect callback —
    // deliberately, not two independently-configured origins that could
    // silently drift apart (EAP-1).
    const allowedOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN);

    const configValidation = validateProductionConfig(env);
    if (!configValidation.valid && !configWarningLogged) {
      configWarningLogged = true;
      logger.error("production configuration invalid", {
        environment: configValidation.environment,
        issues: configValidation.issues,
      });
    }

    // AUTH_SECRET absent (no .dev.vars configured) means /api/auth/* simply
    // doesn't exist yet, rather than the Worker crashing on startup — the
    // rest of the API (leads, assessments, health) works with zero auth
    // configuration, which local dev without a generated secret still needs.
    const authConfig = env.AUTH_SECRET
      ? createAuthConfig({
          db: env.DB,
          secret: env.AUTH_SECRET,
          google:
            env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
              ? { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }
              : undefined,
          github:
            env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
              ? { clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET }
              : undefined,
          resend:
            env.RESEND_API_KEY && env.EMAIL_FROM
              ? { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }
              : undefined,
          logger,
          allowedOrigin,
        })
      : undefined;

    return handleRequest(request, {
      leads: createD1LeadRepository(env.DB),
      assessments: createD1AssessmentRepository(env.DB),
      organizations: createD1OrganizationRepository(env.DB),
      audit: createD1AuditRepository(env.DB),
      userProfiles: createD1UserProfileRepository(env.DB),
      users: createD1UserRepository(env.DB),
      supportRequests: createD1SupportRequestRepository(env.DB),
      subscriptions: createD1SubscriptionRepository(env.DB),
      licenses: createD1LicenseRepository(env.DB),
      billingTransactions: createD1BillingTransactionRepository(env.DB),
      webhookEvents: createD1WebhookEventRepository(env.DB),
      razorpayCredentials:
        env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
          ? { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET }
          : undefined,
      razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
      // Real recurring billing's own transactional emails — the exact same
      // Resend account/credentials the magic-link email above already uses,
      // just exposed to router.ts under its own key since router.ts (not
      // auth/config.ts) is what actually sends these.
      billingEmailCredentials:
        env.RESEND_API_KEY && env.EMAIL_FROM
          ? { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }
          : undefined,
      logger,
      rateLimiter,
      authRateLimiter,
      metrics,
      allowedOrigin,
      authConfig,
      configValidation,
      // A trivial, real query — not a repository call — so a readiness
      // failure means "D1 itself is unreachable", not "this one table has a
      // problem". GET /health/ready turns this into a 503 the moment it
      // rejects or resolves false.
      readinessCheck: () =>
        env.DB.prepare("SELECT 1")
          .first()
          .then(() => true)
          .catch(() => false),
    });
  },

  /** Real Cloudflare Cron Trigger (`wrangler.toml`'s `[triggers]`) — the
   * only caller of `runSubscriptionExpirySweep`. Not reachable via HTTP:
   * Workers' own `scheduled()` export is invoked directly by Cloudflare's
   * cron infrastructure, not by a request this Worker's own `fetch()`
   * router ever sees. `ctx.waitUntil` keeps the isolate alive until the
   * sweep (and every D1 write it makes) actually finishes, the same
   * documented pattern every Workers Cron Trigger example uses — without
   * it, Cloudflare may recycle the isolate the moment this function
   * returns, mid-sweep. */
  scheduled(_event: unknown, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(
      runSubscriptionExpirySweep(
        {
          subscriptions: createD1SubscriptionRepository(env.DB),
          licenses: createD1LicenseRepository(env.DB),
          audit: createD1AuditRepository(env.DB),
          userProfiles: createD1UserProfileRepository(env.DB),
          users: createD1UserRepository(env.DB),
          billingEmailCredentials:
            env.RESEND_API_KEY && env.EMAIL_FROM
              ? { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }
              : undefined,
        },
        logger,
      ).catch((error) => {
        logger.error("subscription expiry sweep failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    );
  },
};

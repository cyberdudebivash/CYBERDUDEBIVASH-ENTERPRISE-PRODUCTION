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
import { handleRequest } from "./router.js";
import { resolveAllowedOrigin } from "./http/cors.js";
import { createLogger } from "./observability/logger.js";
import { createInMemoryMetrics } from "./observability/metrics.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_GITHUB_ID?: string;
  AUTH_GITHUB_SECRET?: string;
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

// Not deployed anywhere (no Cloudflare account/credentials in this
// environment — DECISION_LOG.md), but verified against a real local D1
// instance via `wrangler dev` (Workstream 10 — local operational
// verification), not just against fakes in tests.
export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // One resolved value feeds both CORS and Auth.js's redirect callback —
    // deliberately, not two independently-configured origins that could
    // silently drift apart (EAP-1).
    const allowedOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN);

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
      logger,
      rateLimiter,
      authRateLimiter,
      metrics,
      allowedOrigin,
      authConfig,
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
};

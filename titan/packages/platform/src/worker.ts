import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { createD1AssessmentRepository } from "./repositories/assessmentRepository.d1.js";
import { createD1AuditRepository } from "./repositories/auditRepository.d1.js";
import { createD1LeadRepository } from "./repositories/leadRepository.d1.js";
import { handleRequest } from "./router.js";
import { createLogger } from "./observability/logger.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
}

// Module-scoped (not per-request): a Workers isolate is reused across many
// requests during its lifetime, so the rate limiter's counters and the
// logger's base fields persist the way they're meant to for the isolate's
// duration. See security/rateLimiter.ts for why this is a real limiter but
// only a per-isolate one, not a global production control.
const logger = createLogger({ service: "titan-platform" });
const rateLimiter = createInMemoryRateLimiter({ limit: 30, windowMs: 60_000 });

// Not deployed anywhere (no Cloudflare account/credentials in this
// environment — DECISION_LOG.md), but verified against a real local D1
// instance via `wrangler dev` (Workstream 10 — local operational
// verification), not just against fakes in tests.
export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, {
      leads: createD1LeadRepository(env.DB),
      assessments: createD1AssessmentRepository(env.DB),
      audit: createD1AuditRepository(env.DB),
      logger,
      rateLimiter,
      allowedOrigin: env.ALLOWED_ORIGIN,
    });
  },
};

import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { createD1LeadRepository } from "./repositories/leadRepository.d1.js";
import { handleRequest } from "./router.js";

export interface Env {
  DB: D1Database;
}

// Not deployed anywhere (no Cloudflare account/credentials in this environment —
// DECISION_LOG.md) and not called by titan/apps/web yet (Workstream 7, still
// localStorage-backed via leadStore.ts). This is the real Workers entrypoint
// shape, exercised in tests via worker.test.ts's fake D1, not via wrangler dev.
export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, { leads: createD1LeadRepository(env.DB) });
  },
};

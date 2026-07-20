import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "./worker.js";
import { createFakeD1 } from "./repositories/testUtils/fakeD1.js";

const noopContext = {} as ExecutionContext;

describe("worker (default export)", () => {
  it("wires a real env.DB through to a working /health response", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health"),
      { DB: createFakeD1() },
      noopContext,
    );
    expect(response.status).toBe(200);
  });

  it("wires a real env.DB through to the D1-backed lead repository end to end", async () => {
    const db = createFakeD1();
    const env = { DB: db };

    const createResponse = await worker.fetch(
      new Request("https://example.com/api/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Asha Rao",
          email: "asha@acme.in",
          company: "Acme Fintech",
          answers: {},
          result: {
            score: 0,
            riskLevel: "low",
            breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          timestamp: "2026-07-20T00:00:00.000Z",
          source: "dpdp-scan",
        }),
      }),
      env,
      noopContext,
    );
    expect(createResponse.status).toBe(201);

    // A second request against the same fake DB sees the lead the first one
    // wrote — proving worker.ts's env.DB really reaches the repository, not a
    // per-request throwaway instance.
    const listedViaSecondPrepare = await db.prepare("SELECT * FROM leads").all();
    expect(listedViaSecondPrepare.results).toHaveLength(1);
  });
});

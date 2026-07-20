import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "./worker.js";
import { createTestD1Factory } from "./repositories/testUtils/testD1.js";

const noopContext = {} as ExecutionContext;
const createDb = await createTestD1Factory();

describe("worker (default export)", () => {
  it("wires a real env.DB through to a working /health response", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health"),
      { DB: createDb() },
      noopContext,
    );
    expect(response.status).toBe(200);
  });

  it("wires a real env.DB through to the D1-backed lead repository end to end", async () => {
    const env = { DB: createDb() };

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

    // A second request against the same env.DB sees the lead the first one
    // wrote — proving worker.ts's env.DB really reaches the repository, not a
    // per-request throwaway instance.
    const listResponse = await worker.fetch(
      new Request("https://example.com/api/leads"),
      env,
      noopContext,
    );
    const listed = (await listResponse.json()) as unknown[];
    expect(listed).toHaveLength(1);
  });

  it("wires a real env.DB through to the D1-backed assessment repository end to end", async () => {
    const env = { DB: createDb() };

    const createResponse = await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: "v1",
          answers: { has_dpo: false },
          result: {
            score: 33,
            riskLevel: "medium",
            breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
        }),
      }),
      env,
      noopContext,
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const getResponse = await worker.fetch(
      new Request(`https://example.com/api/assessments/${created.id}`),
      env,
      noopContext,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({ id: created.id, framework: "dpdp" });
  });
});

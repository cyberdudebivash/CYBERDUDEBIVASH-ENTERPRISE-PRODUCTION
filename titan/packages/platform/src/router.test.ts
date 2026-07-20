import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
import { handleRequest } from "./router.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

const validBody = {
  name: "Asha Rao",
  email: "asha@acme.in",
  company: "Acme Fintech",
  answers: { has_dpo: false },
  result: sampleResult,
  timestamp: "2026-07-20T00:00:00.000Z",
  source: "dpdp-scan",
};

describe("handleRequest", () => {
  it("GET /health returns 200 with a status payload", async () => {
    const response = await handleRequest(new Request("https://example.com/health"), {
      leads: createInMemoryLeadRepository(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", service: "titan-platform" });
  });

  it("POST /api/leads with a valid body saves the lead and returns 201", async () => {
    const leads = createInMemoryLeadRepository();
    const response = await handleRequest(
      new Request("https://example.com/api/leads", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      { leads },
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string };
    expect(body.id).toBeTruthy();
    expect(await leads.list()).toHaveLength(1);
  });

  it("POST /api/leads with a missing field returns 400 and saves nothing", async () => {
    const leads = createInMemoryLeadRepository();
    // JSON.stringify drops keys with an undefined value, so this really is a
    // body missing "email" once serialized, without an unused destructured var.
    const withoutEmail = { ...validBody, email: undefined };
    const response = await handleRequest(
      new Request("https://example.com/api/leads", {
        method: "POST",
        body: JSON.stringify(withoutEmail),
      }),
      { leads },
    );

    expect(response.status).toBe(400);
    expect(await leads.list()).toEqual([]);
  });

  it("POST /api/leads with invalid JSON returns 400", async () => {
    const leads = createInMemoryLeadRepository();
    const response = await handleRequest(
      new Request("https://example.com/api/leads", { method: "POST", body: "{not json" }),
      { leads },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unmatched route", async () => {
    const response = await handleRequest(new Request("https://example.com/nope"), {
      leads: createInMemoryLeadRepository(),
    });
    expect(response.status).toBe(404);
  });
});

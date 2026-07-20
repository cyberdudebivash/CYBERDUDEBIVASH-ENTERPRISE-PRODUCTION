import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
import { createInMemoryAssessmentRepository } from "./repositories/assessmentRepository.memory.js";
import { createInMemoryAuditRepository } from "./repositories/auditRepository.memory.js";
import type { Dependencies } from "./router.js";
import { handleRequest } from "./router.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";
import type { Logger } from "./observability/logger.js";
import { createAuthConfig } from "./auth/config.js";
import { createTestD1Factory } from "./repositories/testUtils/testD1.js";

const createAuthDb = await createTestD1Factory();

const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };

function createTestDeps(): Dependencies {
  return {
    leads: createInMemoryLeadRepository(),
    assessments: createInMemoryAssessmentRepository(),
    audit: createInMemoryAuditRepository(),
    logger: silentLogger,
    // A generous limit by default: only the dedicated rate-limit test needs
    // a tight one, and a shared low default would make every other test
    // flaky depending on how many requests ran before it.
    rateLimiter: createInMemoryRateLimiter({ limit: 1000, windowMs: 60_000 }),
  };
}

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

const validLeadBody = {
  name: "Asha Rao",
  email: "asha@acme.in",
  company: "Acme Fintech",
  answers: { has_dpo: false },
  result: sampleResult,
  timestamp: "2026-07-20T00:00:00.000Z",
  source: "dpdp-scan",
};

const validAssessmentBody = {
  framework: "dpdp",
  frameworkVersion: "v1",
  answers: { has_dpo: false },
  result: sampleResult,
  createdAt: "2026-07-20T00:00:00.000Z",
};

describe("handleRequest", () => {
  describe("GET /health", () => {
    it("returns 200 with a status payload", async () => {
      const response = await handleRequest(
        new Request("https://example.com/health"),
        createTestDeps(),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "ok", service: "titan-platform" });
    });
  });

  describe("POST /api/leads", () => {
    it("saves the lead, records an audit event, and returns 201", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          body: JSON.stringify(validLeadBody),
        }),
        deps,
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string };
      expect(body.id).toBeTruthy();
      expect(await deps.leads.list()).toHaveLength(1);

      const events = await deps.audit.list();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: "lead.created",
        entityType: "lead",
        entityId: body.id,
      });
    });

    it("with a missing field returns 400 and saves nothing", async () => {
      const deps = createTestDeps();
      // JSON.stringify drops keys with an undefined value, so this really is a
      // body missing "email" once serialized, without an unused destructured var.
      const withoutEmail = { ...validLeadBody, email: undefined };
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          body: JSON.stringify(withoutEmail),
        }),
        deps,
      );

      expect(response.status).toBe(400);
      expect(await deps.leads.list()).toEqual([]);
    });

    it("with invalid JSON returns 400", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", { method: "POST", body: "{not json" }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/leads", () => {
    it("returns previously saved leads", async () => {
      const deps = createTestDeps();
      await deps.leads.save({ ...validLeadBody });
      const response = await handleRequest(new Request("https://example.com/api/leads"), deps);
      expect(response.status).toBe(200);
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("POST /api/assessments", () => {
    it("saves the assessment, records an audit event, and returns 201", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments", {
          method: "POST",
          body: JSON.stringify(validAssessmentBody),
        }),
        deps,
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string };
      expect(body.id).toBeTruthy();

      const events = await deps.audit.list();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ action: "assessment.created", entityType: "assessment" });
    });

    it("with a missing field returns 400", async () => {
      const deps = createTestDeps();
      const withoutFramework = { ...validAssessmentBody, framework: undefined };
      const response = await handleRequest(
        new Request("https://example.com/api/assessments", {
          method: "POST",
          body: JSON.stringify(withoutFramework),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/assessments/:id", () => {
    it("returns a previously saved assessment", async () => {
      const deps = createTestDeps();
      const saved = await deps.assessments.save({
        organizationId: null,
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: "v1",
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: saved.id, framework: "dpdp" });
    });

    it("returns 404 for an unknown id", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/does-not-exist"),
        deps,
      );
      expect(response.status).toBe(404);
    });
  });

  describe("/api/auth/*", () => {
    it("returns 404 when no authConfig is supplied", async () => {
      const response = await handleRequest(
        new Request("https://example.com/api/auth/session"),
        createTestDeps(),
      );
      expect(response.status).toBe(404);
    });

    it("delegates to Auth.js and returns an empty session when authConfig is supplied", async () => {
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
      };
      const response = await handleRequest(
        new Request("https://example.com/api/auth/session"),
        deps,
      );
      expect(response.status).toBe(200);
      // Auth.js's /session action returns JSON `null` (not `{}`) when there
      // is no active session — verified behavior, not an assumption.
      expect(await response.json()).toBeNull();
    });

    it("still attaches security headers and a request id to Auth.js's own responses", async () => {
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
      };
      const response = await handleRequest(
        new Request("https://example.com/api/auth/session"),
        deps,
      );
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Request-Id")).toBeTruthy();
    });
  });

  it("returns 404 for an unmatched route", async () => {
    const response = await handleRequest(new Request("https://example.com/nope"), createTestDeps());
    expect(response.status).toBe(404);
  });

  it("attaches security headers and a request id to every response", async () => {
    const response = await handleRequest(
      new Request("https://example.com/health"),
      createTestDeps(),
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'none'");
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("reuses an inbound X-Request-Id instead of minting a new one", async () => {
    const response = await handleRequest(
      new Request("https://example.com/health", { headers: { "X-Request-Id": "req-123" } }),
      createTestDeps(),
    );
    expect(response.headers.get("X-Request-Id")).toBe("req-123");
  });

  it("answers an OPTIONS preflight with CORS headers and no body", async () => {
    const response = await handleRequest(
      new Request("https://example.com/api/leads", { method: "OPTIONS" }),
      createTestDeps(),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("attaches CORS headers to normal responses using the configured allowed origin", async () => {
    const response = await handleRequest(new Request("https://example.com/health"), {
      ...createTestDeps(),
      allowedOrigin: "https://app.example.com",
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
  });

  it("rate-limits POST /api/leads per client IP once the limit is exceeded", async () => {
    const deps: Dependencies = {
      ...createTestDeps(),
      rateLimiter: createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 }),
    };
    const makeRequest = () =>
      handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          headers: { "cf-connecting-ip": "203.0.113.1" },
          body: JSON.stringify(validLeadBody),
        }),
        deps,
      );

    const first = await makeRequest();
    expect(first.status).toBe(201);

    const second = await makeRequest();
    expect(second.status).toBe(429);
    expect(second.headers.get("X-Request-Id")).toBeTruthy();
  });
});

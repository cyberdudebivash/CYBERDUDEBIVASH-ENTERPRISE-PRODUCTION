import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import { scoreAssessment, dpdpV1 } from "@titan/assessment-core";
import { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
import { createInMemoryAssessmentRepository } from "./repositories/assessmentRepository.memory.js";
import { createInMemoryAuditRepository } from "./repositories/auditRepository.memory.js";
import { createInMemoryOrganizationRepository } from "./repositories/organizationRepository.memory.js";
import { createInMemoryUserProfileRepository } from "./repositories/userProfileRepository.memory.js";
import type { Dependencies } from "./router.js";
import { handleRequest } from "./router.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";
import type { Logger } from "./observability/logger.js";
import { createInMemoryMetrics } from "./observability/metrics.js";
import { createAuthConfig } from "./auth/config.js";
import { createTestCaller } from "./auth/testUtils/testSession.js";
import { createTestD1Factory } from "./repositories/testUtils/testD1.js";
import type { OrganizationRepository, UserProfileRepository } from "./repositories/types.js";

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

/**
 * Security Release Blocker Sprint: `GET /api/leads` and
 * `GET /api/assessments/:id` need a real session (resolveCaller does a real
 * `getSession` call against `deps.authConfig`), so these tests can't reuse
 * the plain in-memory `createTestDeps()` — they need a real Auth.js
 * adapter (`createAuthDb`, this file's shared sql.js D1 instance) plus a
 * `userProfiles` repository to grant roles against.
 */
function createAuthorizedTestDeps(): Dependencies & {
  userProfiles: UserProfileRepository;
  organizations: OrganizationRepository;
} {
  return {
    ...createTestDeps(),
    authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
    userProfiles: createInMemoryUserProfileRepository(),
    organizations: createInMemoryOrganizationRepository(),
  };
}

/** EAP-2: several new describe blocks below each need a signed-in Platform
 * Administrator — the exact setup `describe("GET /api/leads", ...)` above
 * already inlines once. Factored out here since EAP-2 repeats it well
 * beyond the three-times-is-fine threshold this codebase otherwise holds
 * to (DEVELOPER_GUIDE.md). Existing call sites above are left as they are
 * — untouched, still-passing tests aren't worth churning for this alone. */
async function createPlatformAdministratorCaller(
  deps: Dependencies & { userProfiles: UserProfileRepository },
) {
  const caller = await createTestCaller(deps.authConfig!);
  await deps.userProfiles.save({
    userId: caller.userId,
    organizationId: null,
    role: "owner",
    createdAt: "2026-07-20T00:00:00.000Z",
  });
  return caller;
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
  frameworkVersion: dpdpV1.version,
  answers: { has_dpo: false },
  result: sampleResult,
  createdAt: "2026-07-20T00:00:00.000Z",
};

/** The real recomputed result for `{ has_dpo: false }` — computed via the
 * same `scoreAssessment` router.ts itself calls, not a hand-derived magic
 * number, so this stays correct if the DPDP question bank ever changes. */
const recomputedResultForHasDpoFalse = scoreAssessment(dpdpV1.questions, { has_dpo: false });

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

  describe("GET /health/ready", () => {
    it("returns 200 when no readinessCheck is configured", async () => {
      const response = await handleRequest(
        new Request("https://example.com/health/ready"),
        createTestDeps(),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "ready" });
    });

    it("returns 200 when the readinessCheck resolves true", async () => {
      const response = await handleRequest(new Request("https://example.com/health/ready"), {
        ...createTestDeps(),
        readinessCheck: async () => true,
      });
      expect(response.status).toBe(200);
    });

    it("returns 503 when the readinessCheck resolves false", async () => {
      const response = await handleRequest(new Request("https://example.com/health/ready"), {
        ...createTestDeps(),
        readinessCheck: async () => false,
      });
      expect(response.status).toBe(503);
    });

    it("returns 503 (not an unhandled exception) when the readinessCheck rejects", async () => {
      const response = await handleRequest(new Request("https://example.com/health/ready"), {
        ...createTestDeps(),
        readinessCheck: async () => {
          throw new Error("D1 unreachable");
        },
      });
      expect(response.status).toBe(503);
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

    it("recomputes the risk result server-side from answers, discarding a tampered client result", async () => {
      // Security Release Blocker Sprint: the client claims a maximal,
      // obviously-fabricated CRITICAL/100 result alongside real DPDP
      // answers ({ has_dpo: false } and nothing else) that don't remotely
      // support it. The persisted result must be the server's own real
      // computation, not the client's claim — proven two ways: it equals
      // the real recomputation, and it is not the tampered value.
      const tamperedResult = { ...sampleResult, score: 100, riskLevel: "critical" as const };
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          body: JSON.stringify({
            ...validLeadBody,
            answers: { has_dpo: false },
            result: tamperedResult,
          }),
        }),
        deps,
      );

      expect(response.status).toBe(201);
      const savedLeads = await deps.leads.list();
      expect(savedLeads).toHaveLength(1);
      expect(savedLeads[0]?.result).toEqual(recomputedResultForHasDpoFalse);
      expect(savedLeads[0]?.result).not.toEqual(tamperedResult);
    });
  });

  describe("GET /api/leads", () => {
    it("returns 401 for an anonymous caller (no session)", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody });
      const response = await handleRequest(new Request("https://example.com/api/leads"), deps);
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller who is not a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/leads", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 with every lead for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/leads", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("GET /api/leads/:id (EAP-2)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown lead id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/leads/does-not-exist", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 200 with the real lead and records a lead.viewed audit event with a real actor", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { id: string };
      expect(body.id).toBe(saved.id);

      const events = await deps.audit.list();
      const viewed = events.find((event) => event.action === "lead.viewed");
      expect(viewed).toMatchObject({
        entityType: "lead",
        entityId: saved.id,
        actorId: caller.userId,
      });
    });
  });

  describe("PATCH /api/leads/:id (EAP-2)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "contacted" }),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "contacted" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
          body: JSON.stringify({ status: "contacted" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown lead id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/leads/does-not-exist", {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "contacted" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 400 for an invalid status", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "not-a-real-status" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("updates status, persists it, and records a lead.status_changed audit event with from/to", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "qualified" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe("qualified");

      const reread = await deps.leads.findById(saved.id);
      expect(reread?.status).toBe("qualified");

      const events = await deps.audit.list();
      const changed = events.find((event) => event.action === "lead.status_changed");
      expect(changed).toMatchObject({
        entityId: saved.id,
        actorId: caller.userId,
        metadata: { from: "new", to: "qualified" },
      });
    });

    it("does not record a status-changed event when status is patched to its current value", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody, status: "qualified" });
      const caller = await createPlatformAdministratorCaller(deps);

      await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "qualified" }),
        }),
        deps,
      );

      const events = await deps.audit.list();
      expect(events.find((event) => event.action === "lead.status_changed")).toBeUndefined();
    });

    it("updates assignment, including clearing it back to unassigned", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);

      await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ assignedTo: "user_42" }),
        }),
        deps,
      );
      expect((await deps.leads.findById(saved.id))?.assignedTo).toBe("user_42");

      await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ assignedTo: null }),
        }),
        deps,
      );
      expect((await deps.leads.findById(saved.id))?.assignedTo).toBeNull();

      const events = await deps.audit.list();
      expect(events.filter((event) => event.action === "lead.assigned")).toHaveLength(2);
    });

    it("adds a note as an audit event without mutating the lead record", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.leads.save({ ...validLeadBody });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/leads/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ note: "Called, left voicemail." }),
        }),
        deps,
      );
      expect(response.status).toBe(200);

      const reread = await deps.leads.findById(saved.id);
      expect(reread?.status).toBe("new"); // unchanged — a note isn't a lifecycle field

      const events = await deps.audit.list();
      const noteEvent = events.find((event) => event.action === "lead.note_added");
      expect(noteEvent).toMatchObject({
        entityId: saved.id,
        actorId: caller.userId,
        metadata: { note: "Called, left voicemail." },
      });
    });
  });

  describe("GET /api/leads/search (EAP-2)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads/search"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request("https://example.com/api/leads/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a paginated envelope with every lead when no filters are given", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody });
      await deps.leads.save({ ...validLeadBody, email: "second@acme.in" });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/leads/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { leads: unknown[]; total: number; page: number };
      expect(body.total).toBe(2);
      expect(body.leads).toHaveLength(2);
      expect(body.page).toBe(1);
    });

    it("filters by status via a query param", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody, status: "qualified" });
      await deps.leads.save({ ...validLeadBody, email: "second@acme.in" });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/leads/search?status=qualified", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    it("returns 400 for an invalid status filter", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/leads/search?status=bogus", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 for a non-numeric page", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/leads/search?page=not-a-number", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("searches by name/email/company substring", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody, company: "Acme Fintech" });
      await deps.leads.save({ ...validLeadBody, email: "b@example.com", company: "Globex Retail" });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/leads/search?search=fintech", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as { total: number; leads: Array<{ company: string }> };
      expect(body.total).toBe(1);
      expect(body.leads[0]?.company).toBe("Acme Fintech");
    });

    it("EAP-3: filters by assessmentId (Assessment Details' lead-linkage panel)", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({ ...validLeadBody, assessmentId: "assessment_1" });
      await deps.leads.save({
        ...validLeadBody,
        email: "second@acme.in",
        assessmentId: "assessment_2",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/leads/search?assessmentId=assessment_1", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as {
        total: number;
        leads: Array<{ assessmentId: string }>;
      };
      expect(body.total).toBe(1);
      expect(body.leads[0]?.assessmentId).toBe("assessment_1");
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

    it("recomputes the risk result server-side from answers, discarding a tampered client result", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments", {
          method: "POST",
          body: JSON.stringify({
            ...validAssessmentBody,
            answers: { has_dpo: false },
            result: { ...sampleResult, score: 0, riskLevel: "low" },
          }),
        }),
        deps,
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as { result: AssessmentResult };
      expect(body.result).toEqual(recomputedResultForHasDpoFalse);
    });

    it("returns 400 for an unrecognized framework/frameworkVersion (can't recompute what it can't score)", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments", {
          method: "POST",
          body: JSON.stringify({
            ...validAssessmentBody,
            frameworkVersion: "0.0.1-does-not-exist",
          }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "unsupported_framework" } });
    });
  });

  describe("GET /api/assessments/:id", () => {
    it("returns 401 for an anonymous caller (no session)", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 200 for a member of the assessment's own organization", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: saved.id, framework: "dpdp" });
    });

    it("returns 403 for a member of a different organization", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_2",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 for a Platform Administrator regardless of organization", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
    });

    it("returns 404 for an unknown id, even for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/does-not-exist"),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("EAP-3: records an assessment.viewed audit event with the real caller as actor", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);

      const events = await deps.audit.list({ entityType: "assessment", entityId: saved.id });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ action: "assessment.viewed", actorId: caller.userId });
    });

    it("does not record assessment.viewed when the caller is forbidden", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_2",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      await handleRequest(
        new Request(`https://example.com/api/assessments/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );

      const events = await deps.audit.list({ entityType: "assessment", entityId: saved.id });
      expect(events).toHaveLength(0);
    });
  });

  describe("GET /api/assessments/search (EAP-3)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a paginated envelope with every assessment when no filters are given", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
      });
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
        createdAt: "2026-07-21T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        assessments: unknown[];
        total: number;
        page: number;
      };
      expect(body.total).toBe(2);
      expect(body.assessments).toHaveLength(2);
      expect(body.page).toBe(1);
    });

    it("filters by framework via a query param", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
        framework: "dpdp",
      });
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
        framework: "iso27001",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?framework=iso27001", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    it("filters by riskLevel via a query param", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
        result: { ...sampleResult, riskLevel: "critical" },
      });
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: null,
        result: { ...sampleResult, riskLevel: "low" },
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?riskLevel=critical", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    it("returns 400 for an invalid riskLevel filter", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?riskLevel=bogus", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 for an invalid sortBy", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?sortBy=bogus", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 for a non-numeric page", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?page=not-a-number", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("searches by id/organizationId/createdBy substring", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: "user_zenith",
      });
      await deps.assessments.save({
        ...validAssessmentBody,
        organizationId: null,
        createdBy: "user_other",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/assessments/search?search=zenith", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as {
        total: number;
        assessments: Array<{ createdBy: string }>;
      };
      expect(body.total).toBe(1);
      expect(body.assessments[0]?.createdBy).toBe("user_zenith");
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

    it("uses a relaxed style-src CSP (not the strict JSON-API policy) so Auth.js's own HTML pages render", async () => {
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
      };
      // GET /api/auth/signin (no custom `pages` configured) is real HTML with
      // inline <style> — verified directly against a real Auth() call
      // (finalizeResponse.ts's comment). The strict default-src 'none' used
      // everywhere else would silently break its styling.
      const response = await handleRequest(
        new Request("https://example.com/api/auth/signin"),
        deps,
      );
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("style-src 'unsafe-inline'");
      expect(csp).not.toBe("default-src 'none'");
    });

    it("EAP-1: form-action allows the configured allowedOrigin, not just 'self' — a real finding from real-browser verification, not something a unit test alone would surface", async () => {
      // The CSP spec's form-action directive also restricts *redirects
      // resulting from* a form submission, not just the immediate POST
      // target. Auth.js's real sign-out confirmation page POSTs same-origin
      // but then 302s to callbackUrl (the cross-origin admin SPA) — a
      // form-action of just 'self' makes a real browser refuse to even
      // submit that form. This test only proves the header is correct
      // (verified live against a real Chromium browser separately); it
      // can't reproduce the browser-side blocking behavior itself.
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
        allowedOrigin: "http://localhost:5173",
      };
      const response = await handleRequest(
        new Request("https://example.com/api/auth/signout"),
        deps,
      );
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("form-action 'self' http://localhost:5173");
    });

    it("rate-limits POST /api/auth/* separately from the general API limiter", async () => {
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
        authRateLimiter: createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 }),
      };
      const makeRequest = () =>
        handleRequest(
          new Request("https://example.com/api/auth/signin/email", {
            method: "POST",
            headers: {
              "cf-connecting-ip": "203.0.113.5",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=asha%40acme.in",
          }),
          deps,
        );

      const first = await makeRequest();
      expect(first.status).not.toBe(429);

      const second = await makeRequest();
      expect(second.status).toBe(429);
    });

    it("does not rate-limit GET /api/auth/session against the auth limiter", async () => {
      const deps: Dependencies = {
        ...createTestDeps(),
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
        authRateLimiter: createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 }),
      };
      const makeRequest = () =>
        handleRequest(
          new Request("https://example.com/api/auth/session", {
            headers: { "cf-connecting-ip": "203.0.113.6" },
          }),
          deps,
        );

      await makeRequest();
      const second = await makeRequest();
      expect(second.status).toBe(200);
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
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(response.headers.get("Permissions-Policy")).toBeTruthy();
    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("records a request count and duration metric for every request", async () => {
    const metrics = createInMemoryMetrics();
    await handleRequest(new Request("https://example.com/health"), {
      ...createTestDeps(),
      metrics,
    });

    const counts = metrics.getCounts();
    expect(counts).toHaveLength(1);
    expect(counts[0]).toMatchObject({
      name: "http.request",
      tags: { method: "GET", path: "/health", status: "200" },
      count: 1,
    });

    const durations = metrics.getDurations();
    expect(durations).toHaveLength(1);
    expect(durations[0]?.durations[0]).toBeGreaterThanOrEqual(0);
  });

  it("records a separate repository-operation timing metric, distinct from total request duration", async () => {
    const metrics = createInMemoryMetrics();
    const deps = { ...createTestDeps(), metrics };
    await handleRequest(
      new Request("https://example.com/api/leads", {
        method: "POST",
        body: JSON.stringify(validLeadBody),
      }),
      deps,
    );

    const repoDurations = metrics
      .getDurations()
      .find((d) => d.name === "repository.duration_ms" && d.tags.operation === "leads.save");
    expect(repoDurations).toBeDefined();
    expect(repoDurations?.durations[0]).toBeGreaterThanOrEqual(0);
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

  describe("CSRF (Origin validation on state-changing requests)", () => {
    it("rejects POST /api/leads from an untrusted Origin with 403", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          headers: { Origin: "https://evil.example.com" },
          body: JSON.stringify(validLeadBody),
        }),
        deps,
      );
      expect(response.status).toBe(403);
      expect(await deps.leads.list()).toEqual([]);
    });

    it("rejects POST /api/assessments from an untrusted Origin with 403", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments", {
          method: "POST",
          headers: { Origin: "https://evil.example.com" },
          body: JSON.stringify(validAssessmentBody),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("allows POST /api/leads whose Origin matches the configured allowed origin", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          headers: { Origin: "http://localhost:5173" },
          body: JSON.stringify(validLeadBody),
        }),
        deps,
      );
      expect(response.status).toBe(201);
    });

    it("allows POST /api/leads with no Origin header (non-browser callers)", async () => {
      const deps = createTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/leads", {
          method: "POST",
          body: JSON.stringify(validLeadBody),
        }),
        deps,
      );
      expect(response.status).toBe(201);
    });
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

  describe("GET /api/me (EAP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(new Request("https://example.com/api/me"), deps);
      expect(response.status).toBe(401);
    });

    it("returns the caller's own identity and roles for any authenticated caller, no role required", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!, { email: "member@acme.in" });
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/me", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        userId: caller.userId,
        email: "member@acme.in",
        profiles: [{ organizationId: "org_1", role: "member" }],
        isPlatformAdministrator: false,
      });
    });

    it("reports isPlatformAdministrator: true for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/me", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(await response.json()).toMatchObject({ isPlatformAdministrator: true });
    });
  });

  describe("GET /api/organizations (EAP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/organizations"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller who is not a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 with every organization for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("returns an empty list rather than throwing when no organizations repository is configured", async () => {
      const deps = createAuthorizedTestDeps();
      const depsWithoutOrganizations: Dependencies = { ...deps, organizations: undefined };
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          headers: { cookie: caller.cookie },
        }),
        depsWithoutOrganizations,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  });

  describe("POST /api/organizations (EAP-4)", () => {
    const validOrganizationBody = {
      name: "Acme Fintech",
      slug: "acme-fintech",
      industry: "Financial Services",
      region: "APAC",
      tags: ["enterprise"],
      createdAt: "2026-07-20T00:00:00.000Z",
    };

    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          body: JSON.stringify(validOrganizationBody),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify(validOrganizationBody),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
          body: JSON.stringify(validOrganizationBody),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("saves the organization, records an organization.created audit event, and returns 201", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify(validOrganizationBody),
        }),
        deps,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string; status: string };
      expect(body.id).toBeTruthy();
      expect(body.status).toBe("active");

      const events = await deps.audit.list();
      const created = events.find((event) => event.action === "organization.created");
      expect(created).toMatchObject({ entityId: body.id, actorId: caller.userId });
    });

    it("with a missing field returns 400", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ ...validOrganizationBody, slug: undefined }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns 409 when the slug already exists", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      await deps.organizations.save({
        name: "Existing Org",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request("https://example.com/api/organizations", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify(validOrganizationBody),
        }),
        deps,
      );
      expect(response.status).toBe(409);
    });
  });

  describe("GET /api/organizations/search (EAP-4)", () => {
    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request("https://example.com/api/organizations/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a paginated envelope filtered by status for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const saved = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.organizations.update(saved.id, { status: "archived" });
      await deps.organizations.save({
        name: "Beta Health",
        slug: "beta-health",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/organizations/search?status=archived", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        total: number;
        organizations: Array<{ id: string }>;
      };
      expect(body.total).toBe(1);
      expect(body.organizations[0]?.id).toBe(saved.id);
    });

    it("returns 400 for an invalid status", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations/search?status=not-a-real-status", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/organizations/:id (EAP-4)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 404 for an unknown organization id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations/does-not-exist", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns the organization and records an organization.viewed audit event", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { id: string };
      expect(body.id).toBe(saved.id);

      const events = await deps.audit.list();
      const viewed = events.find((event) => event.action === "organization.viewed");
      expect(viewed).toMatchObject({ entityId: saved.id, actorId: caller.userId });
    });
  });

  describe("PATCH /api/organizations/:id (EAP-4)", () => {
    async function seedOrganization(
      deps: Dependencies & { organizations: OrganizationRepository },
    ) {
      return deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
    }

    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          body: JSON.stringify({ industry: "Healthcare" }),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ industry: "Healthcare" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
          body: JSON.stringify({ industry: "Healthcare" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown organization id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/organizations/does-not-exist", {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ industry: "Healthcare" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 400 for an invalid status", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "not-a-real-status" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("updates metadata, persists it, and records a single organization.updated audit event", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ industry: "Healthcare", region: "EMEA" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { industry: string; region: string };
      expect(body.industry).toBe("Healthcare");
      expect(body.region).toBe("EMEA");

      const reread = await deps.organizations.findById(saved.id);
      expect(reread?.industry).toBe("Healthcare");

      const events = await deps.audit.list();
      const updated = events.filter((event) => event.action === "organization.updated");
      expect(updated).toHaveLength(1);
      expect(updated[0]).toMatchObject({
        entityId: saved.id,
        actorId: caller.userId,
        metadata: {
          industry: { from: null, to: "Healthcare" },
          region: { from: null, to: "EMEA" },
        },
      });
    });

    it("does not record an organization.updated event when nothing actually changed", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);

      await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ name: saved.name }),
        }),
        deps,
      );

      const events = await deps.audit.list();
      expect(events.find((event) => event.action === "organization.updated")).toBeUndefined();
    });

    it("archives and restores via status, recording organization.archived/organization.restored", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);

      const archiveResponse = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "archived" }),
        }),
        deps,
      );
      expect(archiveResponse.status).toBe(200);
      expect(((await archiveResponse.json()) as { status: string }).status).toBe("archived");

      const restoreResponse = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ status: "active" }),
        }),
        deps,
      );
      expect(restoreResponse.status).toBe(200);
      expect(((await restoreResponse.json()) as { status: string }).status).toBe("active");

      const events = await deps.audit.list();
      expect(events.find((event) => event.action === "organization.archived")).toMatchObject({
        entityId: saved.id,
        metadata: { from: "active", to: "archived" },
      });
      expect(events.find((event) => event.action === "organization.restored")).toMatchObject({
        entityId: saved.id,
        metadata: { from: "archived", to: "active" },
      });
    });

    it("adds a note as an audit event without mutating the organization record", async () => {
      const deps = createAuthorizedTestDeps();
      const saved = await seedOrganization(deps);
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/organizations/${saved.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ note: "Renewed enterprise contract." }),
        }),
        deps,
      );
      expect(response.status).toBe(200);

      const reread = await deps.organizations.findById(saved.id);
      expect(reread?.name).toBe("Acme Fintech"); // unchanged — a note isn't a metadata field

      const events = await deps.audit.list();
      const noteEvent = events.find((event) => event.action === "organization.note_added");
      expect(noteEvent).toMatchObject({
        entityId: saved.id,
        actorId: caller.userId,
        metadata: { note: "Renewed enterprise contract." },
      });
    });
  });

  describe("GET /api/assessments (list, EAP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/assessments"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller who is not a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/assessments", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 with every assessment for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        organizationId: null,
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/assessments", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("GET /api/audit (EAP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(new Request("https://example.com/api/audit"), deps);
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller who is not a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/audit", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 with recorded audit events for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "lead.created",
        entityType: "lead",
        entityId: "lead_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: null,
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request("https://example.com/api/audit", { headers: { cookie: caller.cookie } }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });
});

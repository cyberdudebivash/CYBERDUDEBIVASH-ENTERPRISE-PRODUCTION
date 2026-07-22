import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import { scoreAssessment, dpdpV1 } from "@titan/assessment-core";
import { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
import { createInMemoryAssessmentRepository } from "./repositories/assessmentRepository.memory.js";
import { createInMemoryAuditRepository } from "./repositories/auditRepository.memory.js";
import { createInMemoryOrganizationRepository } from "./repositories/organizationRepository.memory.js";
import { createInMemoryUserProfileRepository } from "./repositories/userProfileRepository.memory.js";
import { createD1UserRepository } from "./repositories/userRepository.d1.js";
import { createInMemorySupportRequestRepository } from "./repositories/supportRequestRepository.memory.js";
import { createInMemorySubscriptionRepository } from "./repositories/subscriptionRepository.memory.js";
import { createInMemoryLicenseRepository } from "./repositories/licenseRepository.memory.js";
import type { Dependencies } from "./router.js";
import { handleRequest } from "./router.js";
import { createInMemoryRateLimiter } from "./security/rateLimiter.js";
import type { Logger } from "./observability/logger.js";
import { createInMemoryMetrics } from "./observability/metrics.js";
import { createAuthConfig } from "./auth/config.js";
import { createTestCaller } from "./auth/testUtils/testSession.js";
import { createTestD1Factory } from "./repositories/testUtils/testD1.js";
import type {
  OrganizationRepository,
  UserProfileRepository,
  UserRepository,
} from "./repositories/types.js";

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
  users: UserRepository;
} {
  // EAP-5: `users` reads the *same* D1 instance `authConfig`'s adapter
  // writes real rows into (`createTestCaller`'s `adapter.createUser`) — the
  // same relationship worker.ts's real wiring has (both point at one
  // `env.DB`). Capturing `db` once, rather than calling `createAuthDb()`
  // twice, is what makes that true here too.
  const db = createAuthDb();
  return {
    ...createTestDeps(),
    authConfig: createAuthConfig({ db, secret: "test-secret" }),
    userProfiles: createInMemoryUserProfileRepository(),
    organizations: createInMemoryOrganizationRepository(),
    users: createD1UserRepository(db),
    // CPP-1: every portal test needs this configured, the same reasoning
    // `userProfiles`/`organizations` are always included here too.
    supportRequests: createInMemorySupportRequestRepository(),
    // COM-1: same reasoning, for the commercial describe blocks below.
    subscriptions: createInMemorySubscriptionRepository(),
    licenses: createInMemoryLicenseRepository(),
  };
}

/** CPP-1: the Customer Portal's own caller shape — a real organization
 * member/admin/owner, the same setup `describe("GET /api/assessments/:id",
 * ...)`'s own "member of the assessment's own organization" case already
 * establishes, factored out since every portal describe block below needs
 * it. */
async function createOrganizationMemberCaller(
  deps: Dependencies & { userProfiles: UserProfileRepository },
  organizationId: string,
) {
  const caller = await createTestCaller(deps.authConfig!);
  await deps.userProfiles.save({
    userId: caller.userId,
    organizationId,
    role: "member",
    createdAt: "2026-07-20T00:00:00.000Z",
  });
  return caller;
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

  describe("GET /api/users/search (EAP-5)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/users/search"),
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
        new Request("https://example.com/api/users/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a paginated envelope matching a case-insensitive name/email substring", async () => {
      const deps = createAuthorizedTestDeps();
      const admin = await createPlatformAdministratorCaller(deps);
      const target = await createTestCaller(deps.authConfig!, {
        name: "Zephyr Analytics Lead",
        email: "zephyr@example.com",
      });
      await createTestCaller(deps.authConfig!, { name: "Someone Else", email: "else@example.com" });

      const response = await handleRequest(
        new Request("https://example.com/api/users/search?search=zephyr", {
          headers: { cookie: admin.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number; users: Array<{ id: string }> };
      expect(body.total).toBe(1);
      expect(body.users[0]?.id).toBe(target.userId);
    });

    it("returns 400 for an invalid sortBy", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/users/search?sortBy=notAField", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/users/:id (EAP-5)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}`),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown user id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/users/does-not-exist", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns the user composed with their profiles, and records a user.viewed audit event", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!, {
        name: "Asha Rao",
        email: "asha@example.com",
      });
      await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        id: string;
        email: string;
        profiles: Array<{ organizationId: string | null }>;
      };
      expect(body.id).toBe(target.userId);
      expect(body.email).toBe("asha@example.com");
      expect(body.profiles).toHaveLength(1);
      expect(body.profiles[0]?.organizationId).toBe("org_1");

      const events = await deps.audit.list();
      const viewed = events.find((event) => event.action === "user.viewed");
      expect(viewed).toMatchObject({ entityId: target.userId, actorId: caller.userId });
    });
  });

  describe("POST /api/users/:id/profiles (EAP-5)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          body: JSON.stringify({ organizationId: "org_1", role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createTestCaller(deps.authConfig!);
      await deps.userProfiles.save({
        userId: caller.userId,
        organizationId: "org_1",
        role: "owner",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: "org_1", role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
          body: JSON.stringify({ organizationId: "org_1", role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown target user id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/users/does-not-exist/profiles", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: "org_1", role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 400 for an invalid role", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: "org_1", role: "superuser" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("grants a role, records a user.role_granted audit event, and returns 201", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);
      const org = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: org.id, role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string; organizationId: string; role: string };
      expect(body.organizationId).toBe(org.id);
      expect(body.role).toBe("admin");

      const profiles = await deps.userProfiles.findByUserId(target.userId);
      expect(profiles).toHaveLength(1);

      const events = await deps.audit.list();
      const granted = events.find((event) => event.action === "user.role_granted");
      expect(granted).toMatchObject({ entityId: target.userId, actorId: caller.userId });
    });

    it("grants a platform-wide role when organizationId is null — the self-service path for Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: null, role: "owner" }),
        }),
        deps,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as { organizationId: string | null; role: string };
      expect(body.organizationId).toBeNull();
      expect(body.role).toBe("owner");
    });

    it("returns 409 when the user already has a role for this organization", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);
      const org = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.userProfiles.save({
        userId: target.userId,
        organizationId: org.id,
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: org.id, role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(409);
    });

    it("returns 404 when organizationId names an organization that doesn't exist", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles`, {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ organizationId: "does-not-exist", role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/users/:id/profiles/:profileId (EAP-5)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify({ role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
          body: JSON.stringify({ role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 when the profile id doesn't belong to the user in the URL", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const someoneElse = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: someoneElse.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 400 for an invalid role", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ role: "superuser" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("changes the role and records a single user.role_changed audit event", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ role: "admin" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(((await response.json()) as { role: string }).role).toBe("admin");

      const reread = await deps.userProfiles.findById(profile.id);
      expect(reread?.role).toBe("admin");

      const events = await deps.audit.list();
      const changed = events.filter((event) => event.action === "user.role_changed");
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({
        entityId: target.userId,
        actorId: caller.userId,
        metadata: { profileId: profile.id, from: "member", to: "admin" },
      });
    });

    it("does not record a user.role_changed event when the role is unchanged", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ role: "member" }),
        }),
        deps,
      );

      const events = await deps.audit.list();
      expect(events.find((event) => event.action === "user.role_changed")).toBeUndefined();
    });

    it("returns 409 when demoting the only remaining Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const [onlyProfile] = await deps.userProfiles.findByUserId(caller.userId);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${caller.userId}/profiles/${onlyProfile!.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ role: "member" }),
        }),
        deps,
      );
      expect(response.status).toBe(409);
      expect(await deps.userProfiles.findById(onlyProfile!.id)).toMatchObject({ role: "owner" });
    });

    it("allows demoting a Platform Administrator when another one still exists", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const [callerProfile] = await deps.userProfiles.findByUserId(caller.userId);
      const secondAdmin = await createPlatformAdministratorCaller(deps);
      const [secondProfile] = await deps.userProfiles.findByUserId(secondAdmin.userId);

      const response = await handleRequest(
        new Request(
          `https://example.com/api/users/${secondAdmin.userId}/profiles/${secondProfile!.id}`,
          {
            method: "PATCH",
            headers: { cookie: caller.cookie },
            body: JSON.stringify({ role: "member" }),
          },
        ),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await deps.userProfiles.findById(callerProfile!.id)).toMatchObject({ role: "owner" });
    });
  });

  describe("DELETE /api/users/:id/profiles/:profileId (EAP-5)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "DELETE",
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-Platform-Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
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
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "DELETE",
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a forged cross-origin request even with a valid session cookie", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "DELETE",
          headers: { cookie: caller.cookie, origin: "https://evil.example.com" },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 when the profile id doesn't belong to the user in the URL", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const someoneElse = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: someoneElse.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "DELETE",
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("revokes the profile and records a user.role_revoked audit event", async () => {
      const deps = createAuthorizedTestDeps();
      const target = await createTestCaller(deps.authConfig!);
      const profile = await deps.userProfiles.save({
        userId: target.userId,
        organizationId: "org_1",
        role: "member",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${target.userId}/profiles/${profile.id}`, {
          method: "DELETE",
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await deps.userProfiles.findById(profile.id)).toBeNull();

      const events = await deps.audit.list();
      const revoked = events.find((event) => event.action === "user.role_revoked");
      expect(revoked).toMatchObject({
        entityId: target.userId,
        actorId: caller.userId,
        metadata: { profileId: profile.id, organizationId: "org_1", role: "member" },
      });
    });

    it("returns 409 when revoking the only remaining Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const [onlyProfile] = await deps.userProfiles.findByUserId(caller.userId);

      const response = await handleRequest(
        new Request(`https://example.com/api/users/${caller.userId}/profiles/${onlyProfile!.id}`, {
          method: "DELETE",
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(409);
      expect(await deps.userProfiles.findById(onlyProfile!.id)).not.toBeNull();
    });

    it("allows revoking a Platform Administrator grant when another one still exists", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const secondAdmin = await createPlatformAdministratorCaller(deps);
      const [secondProfile] = await deps.userProfiles.findByUserId(secondAdmin.userId);

      const response = await handleRequest(
        new Request(
          `https://example.com/api/users/${secondAdmin.userId}/profiles/${secondProfile!.id}`,
          { method: "DELETE", headers: { cookie: caller.cookie } },
        ),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await deps.userProfiles.findById(secondProfile!.id)).toBeNull();
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

  describe("GET /api/audit/search (EAP-6)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/audit/search"),
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
        new Request("https://example.com/api/audit/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a paginated envelope filtered by action for a Platform Administrator", async () => {
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
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "assessment.created",
        entityType: "assessment",
        entityId: "assessment_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:01.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/audit/search?action=lead.created", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number; events: Array<{ action: string }> };
      expect(body.total).toBe(1);
      expect(body.events[0]?.action).toBe("lead.created");
    });

    it("filters by an actorId/organizationId/entityType/entityId and a date range", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.audit.record({
        actorId: "user_1",
        organizationId: "org_1",
        action: "organization.viewed",
        entityType: "organization",
        entityId: "org_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.audit.record({
        actorId: "user_2",
        organizationId: "org_2",
        action: "organization.viewed",
        entityType: "organization",
        entityId: "org_2",
        metadata: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request(
          "https://example.com/api/audit/search?actorId=user_1&organizationId=org_1&entityType=organization&entityId=org_1&dateFrom=2026-07-01T00:00:00.000Z&dateTo=2026-07-31T23:59:59.999Z",
          { headers: { cookie: caller.cookie } },
        ),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    it("returns 400 for an invalid sortDirection", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/audit/search?sortDirection=sideways", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/audit/export (EAP-6)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/audit/export"),
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
        new Request("https://example.com/api/audit/export", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns a CSV file with a header row and one row per matching event by default", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.audit.record({
        actorId: "user_1",
        organizationId: null,
        action: "lead.created",
        entityType: "lead",
        entityId: "lead_1",
        metadata: { source: "dpdp-scan" },
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/audit/export", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/csv");
      expect(response.headers.get("content-disposition")).toContain("attachment");
      // A real cross-origin browser fetch() hides Content-Disposition from
      // JS unless the server exposes it explicitly — verified the hard way
      // by real Playwright/Chromium E2E (audit-center.spec.ts) before this
      // assertion existed; see http/cors.ts's EXPOSED_HEADERS comment.
      expect(response.headers.get("access-control-expose-headers")).toContain(
        "Content-Disposition",
      );
      const body = await response.text();
      const lines = body.trim().split("\r\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        "id,actorId,organizationId,action,entityType,entityId,metadata,createdAt",
      );
      expect(lines[1]).toContain("lead.created");
    });

    it("returns a JSON file when format=json", async () => {
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
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/audit/export?format=json", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("returns 400 for an invalid format", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/audit/export?format=pdf", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("respects the same filters as GET /api/audit/search", async () => {
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
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "assessment.created",
        entityType: "assessment",
        entityId: "assessment_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:01.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/audit/export?entityType=lead", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = await response.text();
      expect(body).toContain("lead.created");
      expect(body).not.toContain("assessment.created");
    });
  });

  describe("GET /api/operations/summary (EAP-7)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary"),
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
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns real per-service status, real metrics, and a static overview for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({
        name: "Asha Rao",
        email: "asha@acme.in",
        company: "Acme Fintech",
        answers: {},
        result: sampleResult,
        timestamp: "2026-07-20T00:00:00.000Z",
        source: "dpdp-scan",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      // A prior request so requestCounts/repositoryOperations have something
      // real to report — not asserting on an empty-before-anything state.
      await handleRequest(
        new Request("https://example.com/api/audit", { headers: { cookie: caller.cookie } }),
        deps,
      );

      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        services: Array<{ name: string; configured: boolean; ok: boolean; total?: number }>;
        requestCounts: Array<{ name: string }>;
        repositoryOperations: Array<{ name: string }>;
        overview: { version: string; environment: string; modules: string[] };
      };

      const leads = body.services.find((service) => service.name === "leads");
      expect(leads).toMatchObject({ configured: true, ok: true, total: 1 });

      const organizations = body.services.find((service) => service.name === "organizations");
      expect(organizations).toMatchObject({ configured: true, ok: true });

      expect(body.requestCounts.some((entry) => entry.name === "http.request")).toBe(true);
      expect(body.repositoryOperations.length).toBeGreaterThan(0);

      expect(body.overview.modules).toContain("leads");
      expect(body.overview.modules).toContain("audit");
      expect(typeof body.overview.version).toBe("string");
      expect(body.overview.environment).toContain("local");
    });

    it("reports organizations/users/userProfiles as not configured when a deployment doesn't wire them", async () => {
      const db = createAuthDb();
      const deps: Dependencies = {
        leads: createInMemoryLeadRepository(),
        assessments: createInMemoryAssessmentRepository(),
        audit: createInMemoryAuditRepository(),
        logger: silentLogger,
        rateLimiter: createInMemoryRateLimiter({ limit: 1000, windowMs: 60_000 }),
        authConfig: createAuthConfig({ db, secret: "test-secret" }),
        userProfiles: createInMemoryUserProfileRepository(),
      };
      const caller = await createPlatformAdministratorCaller(
        deps as Dependencies & { userProfiles: UserProfileRepository },
      );

      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        services: Array<{ name: string; configured: boolean; ok: boolean }>;
      };
      // organizations/users are genuinely omitted from this deps object.
      for (const name of ["organizations", "users"]) {
        expect(body.services.find((service) => service.name === name)).toMatchObject({
          configured: false,
          ok: false,
        });
      }
      // userProfiles IS wired here (resolveCaller needs it to authenticate
      // the Platform Administrator caller at all), so it's genuinely
      // configured — not the case this test is about.
      const userProfiles = body.services.find((service) => service.name === "userProfiles");
      expect(userProfiles).toMatchObject({ configured: true, ok: true });
      const leads = body.services.find((service) => service.name === "leads");
      expect(leads).toMatchObject({ configured: true, ok: true });
    });

    it("PRD-1: omits configuration entirely when the deployment didn't compute it (every existing deps object above)", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as { configuration?: unknown };
      expect(body.configuration).toBeUndefined();
    });

    it("PRD-1: surfaces a real, valid configValidation result, overriding overview.environment", async () => {
      const deps = createAuthorizedTestDeps();
      deps.configValidation = {
        environment: "production",
        isProductionTier: true,
        valid: true,
        issues: [],
      };
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as {
        overview: { environment: string };
        configuration?: { environment: string; valid: boolean; issues: unknown[] };
      };
      expect(body.overview.environment).toBe("production");
      expect(body.configuration).toEqual({
        environment: "production",
        isProductionTier: true,
        valid: true,
        issues: [],
      });
    });

    it("PRD-1: surfaces real validation issues for a misconfigured non-local environment, never a fabricated pass", async () => {
      const deps = createAuthorizedTestDeps();
      deps.configValidation = {
        environment: "staging",
        isProductionTier: true,
        valid: false,
        issues: [{ field: "AUTH_SECRET", severity: "error", message: "AUTH_SECRET is not set" }],
      };
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/operations/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const body = (await response.json()) as {
        configuration?: { valid: boolean; issues: Array<{ field: string }> };
      };
      expect(body.configuration?.valid).toBe(false);
      expect(body.configuration?.issues).toEqual([
        expect.objectContaining({ field: "AUTH_SECRET" }),
      ]);
    });
  });

  describe("GET /api/reports/summary (EAP-8)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/reports/summary"),
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
        new Request("https://example.com/api/reports/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns real, server-computed breakdowns for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({
        name: "Asha Rao",
        email: "asha@acme.in",
        company: "Acme Fintech",
        answers: {},
        result: { ...sampleResult, riskLevel: "critical" },
        timestamp: "2026-07-20T00:00:00.000Z",
        source: "dpdp-scan",
      });
      await deps.assessments.save({
        organizationId: null,
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: {},
        result: { ...sampleResult, riskLevel: "high" },
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.organizations.save({
        name: "Acme",
        slug: "acme",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "lead.created",
        entityType: "lead",
        entityId: "lead_1",
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/reports/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        organizations: { configured: boolean; total: number; byStatus: Record<string, number> };
        leads: {
          total: number;
          byStatus: Record<string, number>;
          byRiskLevel: Record<string, number>;
        };
        assessments: { total: number; byRiskLevel: Record<string, number> };
        identity: { configured: boolean; totalProfiles: number; platformAdministrators: number };
        audit: { total: number; last24h: number; topActions: Array<{ action: string }> };
        generatedAt: string;
      };

      expect(body.organizations).toMatchObject({
        configured: true,
        total: 1,
        byStatus: { active: 1, archived: 0 },
      });
      expect(body.leads.total).toBe(1);
      expect(body.leads.byStatus.new).toBe(1);
      expect(body.leads.byRiskLevel.critical).toBe(1);
      expect(body.assessments.total).toBe(1);
      expect(body.assessments.byRiskLevel.high).toBe(1);
      // The Platform Administrator caller itself grants exactly one such
      // profile — a real count from `deps.userProfiles.list()`, not a
      // fabricated non-zero.
      expect(body.identity.configured).toBe(true);
      expect(body.identity.totalProfiles).toBe(1);
      expect(body.identity.platformAdministrators).toBe(1);
      expect(body.audit.total).toBe(1);
      expect(body.audit.last24h).toBe(1);
      expect(body.audit.topActions).toEqual([{ action: "lead.created", count: 1 }]);
      expect(typeof body.generatedAt).toBe("string");
    });

    it("reports organizations/identity as not configured when a deployment doesn't wire them", async () => {
      const db = createAuthDb();
      const deps: Dependencies = {
        leads: createInMemoryLeadRepository(),
        assessments: createInMemoryAssessmentRepository(),
        audit: createInMemoryAuditRepository(),
        logger: silentLogger,
        rateLimiter: createInMemoryRateLimiter({ limit: 1000, windowMs: 60_000 }),
        authConfig: createAuthConfig({ db, secret: "test-secret" }),
        userProfiles: createInMemoryUserProfileRepository(),
        // organizations/users genuinely omitted.
      };
      const caller = await createPlatformAdministratorCaller(
        deps as Dependencies & { userProfiles: UserProfileRepository },
      );

      const response = await handleRequest(
        new Request("https://example.com/api/reports/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        organizations: { configured: boolean; total: number };
        identity: { configured: boolean };
      };
      expect(body.organizations).toMatchObject({ configured: false, total: 0 });
      // userProfiles IS wired (needed to authenticate the caller), but
      // `users` is genuinely absent, so `identity` as a whole is reported
      // not-configured — it needs both.
      expect(body.identity.configured).toBe(false);
    });
  });

  describe("GET /api/reports/trends (EAP-8)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=leads"),
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
        new Request("https://example.com/api/reports/trends?entity=leads", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 400 for a missing or invalid entity", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const missing = await handleRequest(
        new Request("https://example.com/api/reports/trends", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(missing.status).toBe(400);
      const invalid = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=leads_and_more", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(invalid.status).toBe(400);
    });

    it("returns 400 for an out-of-range days value", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=leads&days=91", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("buckets a real lead's timestamp into today's point, zero-filled for every other day", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({
        name: "Asha Rao",
        email: "asha@acme.in",
        company: "Acme Fintech",
        answers: {},
        result: sampleResult,
        timestamp: new Date().toISOString(),
        source: "dpdp-scan",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=leads&days=7", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        entity: string;
        days: number;
        points: Array<{ date: string; count: number }>;
      };
      expect(body.entity).toBe("leads");
      expect(body.points).toHaveLength(7);
      const total = body.points.reduce((sum, point) => sum + point.count, 0);
      expect(total).toBe(1);
      // Today (the last bucket) is where the just-created lead lands.
      expect(body.points.at(-1)?.count).toBe(1);
    });

    it("returns 503 for the organizations entity when organizations isn't configured", async () => {
      const deps = createTestDeps();
      const depsWithAuth: Dependencies = {
        ...deps,
        authConfig: createAuthConfig({ db: createAuthDb(), secret: "test-secret" }),
        userProfiles: createInMemoryUserProfileRepository(),
      };
      const caller = await createPlatformAdministratorCaller(
        depsWithAuth as Dependencies & { userProfiles: UserProfileRepository },
      );
      const response = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=organizations", {
          headers: { cookie: caller.cookie },
        }),
        depsWithAuth,
      );
      expect(response.status).toBe(503);
    });

    it("computes the identity entity from user-related audit events", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "user.role_granted",
        entityType: "user",
        entityId: "user_1",
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      await deps.audit.record({
        actorId: null,
        organizationId: null,
        action: "lead.created",
        entityType: "lead",
        entityId: "lead_1",
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/reports/trends?entity=identity&days=7", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { points: Array<{ count: number }> };
      const total = body.points.reduce((sum, point) => sum + point.count, 0);
      // Only the "user"-entityType event counts — the lead event doesn't.
      expect(total).toBe(1);
    });
  });

  describe("GET /api/reports/export (EAP-8)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/reports/export"),
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
        new Request("https://example.com/api/reports/export", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 400 for an invalid format", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/reports/export?format=pdf", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns a CSV file with real section,metric,value rows by default", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.leads.save({
        name: "Asha Rao",
        email: "asha@acme.in",
        company: "Acme Fintech",
        answers: {},
        result: sampleResult,
        timestamp: "2026-07-20T00:00:00.000Z",
        source: "dpdp-scan",
      });
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/reports/export", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/csv");
      expect(response.headers.get("content-disposition")).toContain("attachment");
      expect(response.headers.get("access-control-expose-headers")).toContain(
        "Content-Disposition",
      );
      const body = await response.text();
      const lines = body.trim().split("\r\n");
      expect(lines[0]).toBe("section,metric,value");
      expect(lines).toContain("leads,total,1");
    });

    it("returns a JSON file of the Executive Summary when format=json", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);

      const response = await handleRequest(
        new Request("https://example.com/api/reports/export?format=json", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = (await response.json()) as { leads: { total: number } };
      expect(body.leads.total).toBe(0);
    });
  });

  describe("GET /api/portal/organization (CPP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/organization"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller with no organization membership", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);

      const response = await handleRequest(
        new Request("https://example.com/api/portal/organization", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 200 with the caller's own organization, derived server-side", async () => {
      const deps = createAuthorizedTestDeps();
      const org = await deps.organizations.save({
        name: "Acme Fintech",
        slug: "acme-fintech",
        industry: "Financial Services",
        region: "APAC",
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, org.id);

      const response = await handleRequest(
        new Request("https://example.com/api/portal/organization", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: org.id, name: "Acme Fintech" });
    });

    it("ignores any organizationId the client tries to supply and always resolves the caller's own", async () => {
      const deps = createAuthorizedTestDeps();
      const ownOrg = await deps.organizations.save({
        name: "Own Org",
        slug: "own-org",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const otherOrg = await deps.organizations.save({
        name: "Other Org",
        slug: "other-org",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, ownOrg.id);

      const response = await handleRequest(
        new Request(`https://example.com/api/portal/organization?organizationId=${otherOrg.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: ownOrg.id });
    });

    it("returns 503 when organizations is not configured", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/organization", {
          headers: { cookie: caller.cookie },
        }),
        { ...deps, organizations: undefined },
      );
      expect(response.status).toBe(503);
    });
  });

  describe("GET /api/portal/assessments (CPP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/assessments"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller with no organization membership", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request("https://example.com/api/portal/assessments", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns only the caller's own organization's assessments, never another organization's", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: true },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.assessments.save({
        organizationId: "org_2",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/assessments", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        assessments: { organizationId: string | null }[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.assessments.every((assessment) => assessment.organizationId === "org_1")).toBe(
        true,
      );
    });
  });

  describe("GET /api/portal/reports/summary (CPP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/summary"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller with no organization membership", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns real counts scoped to the caller's own organization only", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        organizationId: "org_1",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: true },
        result: { ...sampleResult, riskLevel: "critical" },
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.assessments.save({
        organizationId: "org_2",
        createdBy: null,
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: false },
        result: { ...sampleResult, riskLevel: "low" },
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/summary", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        organizationId: string;
        assessments: { total: number; byRiskLevel: Record<string, number> };
      };
      expect(body.organizationId).toBe("org_1");
      expect(body.assessments.total).toBe(1);
      expect(body.assessments.byRiskLevel.critical).toBe(1);
      expect(body.assessments.byRiskLevel.low).toBe(0);
    });
  });

  describe("GET /api/portal/reports/export (CPP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/export"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 for an invalid format", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/export?format=xml", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns a CSV file with only aggregate counts — no individual assessment fields", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.assessments.save({
        organizationId: "org_1",
        createdBy: "user_creator_1",
        framework: "dpdp",
        frameworkVersion: dpdpV1.version,
        answers: { has_dpo: true },
        result: sampleResult,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/reports/export", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toContain("compliance-summary-");
      const body = await response.text();
      expect(body).toContain("assessments,total,1");
      // No individual-record field (a creator id, an answer, an org id
      // other than the header row) ever appears — only known enum keys
      // and counts, the same conservatism `SECURITY_GUIDE.md`'s CPP-1
      // paragraph documents.
      expect(body).not.toContain("user_creator_1");
    });
  });

  describe("GET /api/portal/activity (CPP-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/activity"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns only this organization's own audit events, never another organization's", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.audit.record({
        actorId: null,
        organizationId: "org_1",
        action: "assessment.created",
        entityType: "assessment",
        entityId: "assessment_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.audit.record({
        actorId: null,
        organizationId: "org_2",
        action: "assessment.created",
        entityType: "assessment",
        entityId: "assessment_2",
        metadata: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/activity", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const events = (await response.json()) as { organizationId: string | null }[];
      expect(events).toHaveLength(1);
      expect(events[0]?.organizationId).toBe("org_1");
    });
  });

  describe("GET/POST /api/portal/support (CPP-1)", () => {
    it("returns 401 for an anonymous caller on both GET and POST", async () => {
      const deps = createAuthorizedTestDeps();
      const getResponse = await handleRequest(
        new Request("https://example.com/api/portal/support"),
        deps,
      );
      expect(getResponse.status).toBe(401);

      const postResponse = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          method: "POST",
          body: JSON.stringify({ subject: "Help", message: "Something's wrong" }),
        }),
        deps,
      );
      expect(postResponse.status).toBe(401);
    });

    it("returns 403 for an authenticated caller with no organization membership", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a POST from a mismatched Origin (CSRF)", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          method: "POST",
          headers: { cookie: caller.cookie, origin: "https://evil.example" },
          body: JSON.stringify({ subject: "Help", message: "Something's wrong" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 400 for a missing subject or message", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          method: "POST",
          headers: { cookie: caller.cookie },
          body: JSON.stringify({ subject: "Help" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("creates a real request, retrievable via GET, scoped to the requesting user only", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const otherCaller = await createOrganizationMemberCaller(deps, "org_1");

      const createResponse = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          method: "POST",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({
            subject: "Can't download my report",
            message: "The export button spins but nothing downloads.",
          }),
        }),
        deps,
      );
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as {
        id: string;
        status: string;
        organizationId: string | null;
      };
      expect(created.status).toBe("open");
      expect(created.organizationId).toBe("org_1");

      const ownResponse = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      const ownRequests = (await ownResponse.json()) as { id: string }[];
      expect(ownRequests).toHaveLength(1);
      expect(ownRequests[0]?.id).toBe(created.id);

      const otherResponse = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          headers: { cookie: otherCaller.cookie },
        }),
        deps,
      );
      expect(await otherResponse.json()).toEqual([]);
    });

    it("returns 503 when supportRequests is not configured", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/support", {
          headers: { cookie: caller.cookie },
        }),
        { ...deps, supportRequests: undefined },
      );
      expect(response.status).toBe(503);
    });
  });

  describe("GET /api/commercial/plans (COM-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/plans"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns the real plan catalog for any authenticated caller, no role required", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/plans", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const plans = (await response.json()) as { id: string; entitlements: unknown }[];
      expect(plans.map((p) => p.id).sort()).toEqual(["enterprise", "professional", "starter"]);
    });
  });

  describe("GET /api/portal/commercial/subscription (COM-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated caller with no organization membership", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createTestCaller(deps.authConfig!);
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns an honest all-null shape for an organization with no subscription yet", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { subscription: unknown; plan: unknown };
      expect(body.subscription).toBeNull();
      expect(body.plan).toBeNull();
    });

    it("returns the real subscription, resolved plan, license, seat usage, and entitlements — scoped to the caller's own organization only", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "professional",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.licenses!.save({
        organizationId: "org_1",
        subscriptionId: subscription.id,
        seatLimit: 50,
        status: "active",
        activatedAt: "2026-07-20T00:00:00.000Z",
        expiresAt: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.subscriptions!.save({
        organizationId: "org_2",
        planId: "enterprise",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        organizationId: string;
        subscription: { planId: string };
        plan: { id: string; name: string };
        license: { seatLimit: number };
        seatsUsed: number;
        entitlements: { complianceReportExport: boolean };
      };
      expect(body.organizationId).toBe("org_1");
      expect(body.subscription.planId).toBe("professional");
      expect(body.plan.name).toBe("Professional");
      expect(body.license.seatLimit).toBe(50);
      // seatsUsed reflects real user_profiles membership, not a fabricated
      // count — this caller is org_1's only real member at this point.
      expect(body.seatsUsed).toBe(1);
      expect(body.entitlements.complianceReportExport).toBe(true);
    });

    it("returns 503 when subscriptions is not configured", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          headers: { cookie: caller.cookie },
        }),
        { ...deps, subscriptions: undefined },
      );
      expect(response.status).toBe(503);
    });
  });

  describe("POST /api/portal/commercial/subscription (COM-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          body: JSON.stringify({ planId: "starter" }),
        }),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for a POST from a mismatched Origin (CSRF)", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          headers: { cookie: caller.cookie, origin: "https://evil.example" },
          body: JSON.stringify({ planId: "starter" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 400 for an unknown plan id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "does-not-exist" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 for the sales-assisted enterprise plan — self-service subscribe is blocked", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "enterprise" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
      expect((await response.json()) as { error: { code: string } }).toMatchObject({
        error: { code: "sales_assisted_plan" },
      });
    });

    it("creates a real trialing subscription and an active license, with real audit events", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "starter" }),
        }),
        deps,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as {
        subscription: { status: string; planId: string; trialEndsAt: string | null };
        license: { seatLimit: number; status: string };
      };
      expect(body.subscription.status).toBe("trialing");
      expect(body.subscription.planId).toBe("starter");
      expect(body.subscription.trialEndsAt).not.toBeNull();
      expect(body.license.seatLimit).toBe(10);
      expect(body.license.status).toBe("active");

      const events = await deps.audit.list({ entityType: "subscription" });
      expect(events.some((e) => e.action === "subscription.created")).toBe(true);
      const licenseEvents = await deps.audit.list({ entityType: "license" });
      expect(licenseEvents.some((e) => e.action === "license.activated")).toBe(true);
    });

    it("returns 409 when the organization already has a subscription", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "starter",
        status: "trialing",
        trialEndsAt: "2026-08-03T00:00:00.000Z",
        currentPeriodEnd: "2026-08-03T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "POST",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "professional" }),
        }),
        deps,
      );
      expect(response.status).toBe(409);
    });
  });

  describe("PATCH /api/portal/commercial/subscription (COM-1)", () => {
    async function seedSubscription(deps: ReturnType<typeof createAuthorizedTestDeps>) {
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "starter",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.licenses!.save({
        organizationId: "org_1",
        subscriptionId: subscription.id,
        seatLimit: 10,
        status: "active",
        activatedAt: "2026-07-20T00:00:00.000Z",
        expiresAt: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      return subscription;
    }

    it("returns 404 when no subscription exists yet", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns 403 for a PATCH from a mismatched Origin (CSRF)", async () => {
      const deps = createAuthorizedTestDeps();
      await seedSubscription(deps);
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, origin: "https://evil.example" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("upgrades to a higher-tier plan and raises the license seat limit to match", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await seedSubscription(deps);
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "professional" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { planId: string };
      expect(body.planId).toBe("professional");
      const license = await deps.licenses!.findByOrganizationId("org_1");
      expect(license?.seatLimit).toBe(50);
      const events = await deps.audit.list({
        entityType: "subscription",
        entityId: subscription.id,
      });
      expect(events.some((e) => e.action === "subscription.upgraded")).toBe(true);
    });

    it("downgrades to a lower-tier plan, recorded as a real downgrade event", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "professional",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "starter" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const events = await deps.audit.list({
        entityType: "subscription",
        entityId: subscription.id,
      });
      expect(events.some((e) => e.action === "subscription.downgraded")).toBe(true);
    });

    it("returns 400 when a customer tries to upgrade into the sales-assisted enterprise plan", async () => {
      const deps = createAuthorizedTestDeps();
      await seedSubscription(deps);
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "enterprise" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });

    it("cancels the subscription and expires its license together", async () => {
      const deps = createAuthorizedTestDeps();
      await seedSubscription(deps);
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { status: string; canceledAt: string | null };
      expect(body.status).toBe("canceled");
      expect(body.canceledAt).not.toBeNull();
      const license = await deps.licenses!.findByOrganizationId("org_1");
      expect(license?.status).toBe("expired");
    });

    it("renews a canceled subscription back to active and reactivates its license", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await seedSubscription(deps);
      await deps.subscriptions!.update(subscription.id, {
        status: "canceled",
        canceledAt: "2026-07-21T00:00:00.000Z",
      });
      const license = await deps.licenses!.findByOrganizationId("org_1");
      await deps.licenses!.update(license!.id, { status: "expired" });
      const caller = await createOrganizationMemberCaller(deps, "org_1");

      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        status: string;
        canceledAt: string | null;
        currentPeriodEnd: string;
      };
      expect(body.status).toBe("active");
      expect(body.canceledAt).toBeNull();
      expect(body.currentPeriodEnd).toBeTruthy();
      const reactivatedLicense = await deps.licenses!.findByOrganizationId("org_1");
      expect(reactivatedLicense?.status).toBe("active");
    });

    it("returns 400 for a status a customer may not set directly (trialing)", async () => {
      const deps = createAuthorizedTestDeps();
      await seedSubscription(deps);
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/portal/commercial/subscription", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "trialing" }),
        }),
        deps,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/commercial/subscriptions/search (COM-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/search"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-admin", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns real subscriptions across every organization for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "starter",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.subscriptions!.save({
        organizationId: "org_2",
        planId: "enterprise",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(2);
    });
  });

  describe("GET /api/commercial/subscriptions/:id (COM-1)", () => {
    it("returns 403 for an authenticated non-admin", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/does-not-exist", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown subscription id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/does-not-exist", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });

    it("returns the subscription joined with its resolved plan and license", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "professional",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      await deps.licenses!.save({
        organizationId: "org_1",
        subscriptionId: subscription.id,
        seatLimit: 50,
        status: "active",
        activatedAt: "2026-07-20T00:00:00.000Z",
        expiresAt: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/commercial/subscriptions/${subscription.id}`, {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        subscription: { id: string };
        plan: { name: string };
        license: { seatLimit: number };
      };
      expect(body.subscription.id).toBe(subscription.id);
      expect(body.plan.name).toBe("Professional");
      expect(body.license.seatLimit).toBe(50);
    });
  });

  describe("PATCH /api/commercial/subscriptions/:id (COM-1)", () => {
    it("returns 403 for an authenticated non-admin", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/does-not-exist", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 for a PATCH from a mismatched Origin (CSRF)", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "starter",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/commercial/subscriptions/${subscription.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie, origin: "https://evil.example" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("lets a Platform Administrator assign the sales-assisted enterprise plan directly — unlike the customer-facing PATCH", async () => {
      const deps = createAuthorizedTestDeps();
      const subscription = await deps.subscriptions!.save({
        organizationId: "org_1",
        planId: "starter",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request(`https://example.com/api/commercial/subscriptions/${subscription.id}`, {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ planId: "enterprise" }),
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { planId: string };
      expect(body.planId).toBe("enterprise");
    });

    it("returns 404 for an unknown subscription id", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/subscriptions/does-not-exist", {
          method: "PATCH",
          headers: { cookie: caller.cookie, "content-type": "application/json" },
          body: JSON.stringify({ status: "canceled" }),
        }),
        deps,
      );
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/commercial/licenses/search (COM-1)", () => {
    it("returns 401 for an anonymous caller", async () => {
      const deps = createAuthorizedTestDeps();
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/licenses/search"),
        deps,
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 for an authenticated non-admin", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createOrganizationMemberCaller(deps, "org_1");
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/licenses/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(403);
    });

    it("returns real licenses across every organization for a Platform Administrator", async () => {
      const deps = createAuthorizedTestDeps();
      await deps.licenses!.save({
        organizationId: "org_1",
        subscriptionId: "sub_1",
        seatLimit: 10,
        status: "active",
        activatedAt: "2026-07-20T00:00:00.000Z",
        expiresAt: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/licenses/search", {
          headers: { cookie: caller.cookie },
        }),
        deps,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    it("returns 503 when licenses is not configured", async () => {
      const deps = createAuthorizedTestDeps();
      const caller = await createPlatformAdministratorCaller(deps);
      const response = await handleRequest(
        new Request("https://example.com/api/commercial/licenses/search", {
          headers: { cookie: caller.cookie },
        }),
        { ...deps, licenses: undefined },
      );
      expect(response.status).toBe(503);
    });
  });
});

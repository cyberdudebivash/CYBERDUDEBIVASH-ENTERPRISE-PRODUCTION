import { describe, expect, it } from "vitest";
import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { dpdpV1 } from "@titan/assessment-core";
import worker from "./worker.js";
import { createTestD1Factory } from "./repositories/testUtils/testD1.js";
import { createAuthConfig } from "./auth/config.js";
import { createTestCaller } from "./auth/testUtils/testSession.js";
import { createD1UserProfileRepository } from "./repositories/userProfileRepository.d1.js";
import { createD1OrganizationRepository } from "./repositories/organizationRepository.d1.js";
import { createD1AuditRepository } from "./repositories/auditRepository.d1.js";

const noopContext = {} as ExecutionContext;
const createDb = await createTestD1Factory();

/**
 * `worker.ts` builds its own `AuthConfig` internally from `env.DB` +
 * `env.AUTH_SECRET` — there's no hook to grab that exact instance from a
 * test. Building an equivalent one here, pointed at the same `env.DB`,
 * works because the database session strategy validates a session purely
 * by looking up `sessionToken` in D1 (verified directly against
 * @auth/core's session action) — no shared secret required for that
 * lookup to succeed against a session this second config wrote.
 */
async function createPlatformAdministratorCookie(db: D1Database): Promise<string> {
  const authConfig = createAuthConfig({ db, secret: "test-secret" });
  const caller = await createTestCaller(authConfig);
  await createD1UserProfileRepository(db).save({
    userId: caller.userId,
    organizationId: null,
    role: "owner",
    createdAt: "2026-07-20T00:00:00.000Z",
  });
  return caller.cookie;
}

describe("worker (default export)", () => {
  it("wires a real env.DB through to a working /health response", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health"),
      { DB: createDb() },
      noopContext,
    );
    expect(response.status).toBe(200);
  });

  it("wires a real env.DB through to /health/ready via a real SELECT 1 against real SQLite", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health/ready"),
      { DB: createDb() },
      noopContext,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready" });
  });

  it("wires a real env.DB through to the D1-backed lead repository end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };

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
    // per-request throwaway instance. Security Release Blocker Sprint:
    // GET /api/leads is now Platform-Administrator-only, so this also
    // proves worker.ts really wires a real UserProfileRepository through,
    // not just the D1-backed lead/assessment repositories.
    const cookie = await createPlatformAdministratorCookie(env.DB);
    const listResponse = await worker.fetch(
      new Request("https://example.com/api/leads", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as unknown[];
    expect(listed).toHaveLength(1);
  });

  it("returns 401 for GET /api/leads with no session, through the real worker", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const response = await worker.fetch(
      new Request("https://example.com/api/leads"),
      env,
      noopContext,
    );
    expect(response.status).toBe(401);
  });

  it("wires a real env.DB through to the D1-backed assessment repository end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };

    const createResponse = await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: dpdpV1.version,
          answers: { has_dpo: false },
          result: {
            score: 33,
            riskLevel: "medium",
            breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
          organizationId: "org_1",
        }),
      }),
      env,
      noopContext,
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const cookie = await createPlatformAdministratorCookie(env.DB);
    const getResponse = await worker.fetch(
      new Request(`https://example.com/api/assessments/${created.id}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({ id: created.id, framework: "dpdp" });
  });

  it("EAP-1: wires a real env.DB through to /api/me, /api/organizations, and /api/audit end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const cookie = await createPlatformAdministratorCookie(env.DB);

    const meResponse = await worker.fetch(
      new Request("https://example.com/api/me", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toMatchObject({ isPlatformAdministrator: true });

    // Written directly via the real D1-backed OrganizationRepository, then
    // read back through GET /api/organizations — an empty-list assertion
    // alone wouldn't distinguish "wired correctly but empty" from "worker.ts
    // never wired deps.organizations at all" (the route falls back to `[]`
    // for that case too, by design), so this needs a real fixture.
    await createD1OrganizationRepository(env.DB).save({
      name: "Acme Fintech",
      slug: "acme-fintech",
      industry: null,
      region: null,
      tags: [],
      createdAt: "2026-07-20T00:00:00.000Z",
    });
    const orgResponse = await worker.fetch(
      new Request("https://example.com/api/organizations", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(orgResponse.status).toBe(200);
    const organizations = (await orgResponse.json()) as Array<{ slug: string }>;
    expect(organizations).toHaveLength(1);
    expect(organizations[0]?.slug).toBe("acme-fintech");

    // Same reasoning as organizations above: a real fixture via the D1-backed
    // AuditRepository, read back through GET /api/audit.
    await createD1AuditRepository(env.DB).record({
      actorId: null,
      organizationId: null,
      action: "lead.created",
      entityType: "lead",
      entityId: "lead_1",
      metadata: null,
      createdAt: "2026-07-20T00:00:00.000Z",
    });
    const auditResponse = await worker.fetch(
      new Request("https://example.com/api/audit", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(auditResponse.status).toBe(200);
    const events = (await auditResponse.json()) as Array<{ action: string }>;
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("lead.created");
  });

  it("EAP-2: wires a real env.DB through GET /api/leads/:id, PATCH /api/leads/:id, and GET /api/leads/search end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const cookie = await createPlatformAdministratorCookie(env.DB);

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
    const created = (await createResponse.json()) as { id: string };

    const getResponse = await worker.fetch(
      new Request(`https://example.com/api/leads/${created.id}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({ id: created.id, status: "new" });

    const patchResponse = await worker.fetch(
      new Request(`https://example.com/api/leads/${created.id}`, {
        method: "PATCH",
        headers: { cookie, origin: "http://localhost:5173" },
        body: JSON.stringify({ status: "qualified", priority: "urgent", tags: ["enterprise"] }),
      }),
      env,
      noopContext,
    );
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toMatchObject({ status: "qualified", priority: "urgent" });

    // Real D1 round trip, not just trusting the PATCH response.
    const rereadResponse = await worker.fetch(
      new Request(`https://example.com/api/leads/${created.id}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(await rereadResponse.json()).toMatchObject({
      status: "qualified",
      priority: "urgent",
      tags: ["enterprise"],
    });

    const searchResponse = await worker.fetch(
      new Request("https://example.com/api/leads/search?status=qualified", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(searchResponse.status).toBe(200);
    const searched = (await searchResponse.json()) as { total: number };
    expect(searched.total).toBe(1);

    // lead.viewed (x2, from the two GETs above), lead.status_changed,
    // lead.priority_changed, lead.tags_changed, lead.created — a real,
    // cumulative activity trail through the actual Worker, not a mock.
    const auditResponse = await worker.fetch(
      new Request("https://example.com/api/audit", { headers: { cookie } }),
      env,
      noopContext,
    );
    const events = (await auditResponse.json()) as Array<{ action: string }>;
    expect(events.filter((event) => event.action === "lead.viewed")).toHaveLength(2);
    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "lead.created",
        "lead.status_changed",
        "lead.priority_changed",
        "lead.tags_changed",
      ]),
    );
  });

  it("EAP-3: wires a real env.DB through GET /api/assessments/:id (with assessment.viewed), GET /api/assessments/search, and the lead-linkage filter end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const cookie = await createPlatformAdministratorCookie(env.DB);

    const createResponse = await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: dpdpV1.version,
          answers: { has_dpo: false },
          result: {
            score: 33,
            riskLevel: "medium",
            breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
          organizationId: "org_1",
        }),
      }),
      env,
      noopContext,
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    // Two real reads through the real Worker — each should record its own
    // assessment.viewed event (router.ts's getAssessment, EAP-3).
    for (let i = 0; i < 2; i += 1) {
      const getResponse = await worker.fetch(
        new Request(`https://example.com/api/assessments/${created.id}`, { headers: { cookie } }),
        env,
        noopContext,
      );
      expect(getResponse.status).toBe(200);
    }

    const auditResponse = await worker.fetch(
      new Request(`https://example.com/api/audit?entityType=assessment&entityId=${created.id}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    const events = (await auditResponse.json()) as Array<{ action: string }>;
    expect(events.filter((event) => event.action === "assessment.viewed")).toHaveLength(2);
    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining(["assessment.created", "assessment.viewed"]),
    );

    // GET /api/assessments/search, filtered by the real framework.
    const searchResponse = await worker.fetch(
      new Request("https://example.com/api/assessments/search?framework=dpdp", {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(searchResponse.status).toBe(200);
    const searched = (await searchResponse.json()) as { total: number };
    expect(searched.total).toBe(1);

    // Assessment Details' "Lead linkage" panel: GET /api/leads/search?assessmentId=...
    // finds only the lead actually linked to this assessment, not every lead.
    await worker.fetch(
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
          assessmentId: created.id,
        }),
      }),
      env,
      noopContext,
    );
    await worker.fetch(
      new Request("https://example.com/api/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Other Lead",
          email: "other@acme.in",
          company: "Other Co",
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

    const linkedLeadsResponse = await worker.fetch(
      new Request(`https://example.com/api/leads/search?assessmentId=${created.id}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(linkedLeadsResponse.status).toBe(200);
    const linkedLeads = (await linkedLeadsResponse.json()) as {
      total: number;
      leads: Array<{ name: string }>;
    };
    expect(linkedLeads.total).toBe(1);
    expect(linkedLeads.leads[0]?.name).toBe("Asha Rao");
  });

  it("EAP-4: wires a real env.DB through POST/GET/PATCH /api/organizations, search, and the organization-relationship filters end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const cookie = await createPlatformAdministratorCookie(env.DB);

    const createResponse = await worker.fetch(
      new Request("https://example.com/api/organizations", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          name: "Acme Fintech",
          slug: "acme-fintech",
          industry: "Financial Services",
          region: "APAC",
          tags: ["enterprise"],
          createdAt: "2026-07-20T00:00:00.000Z",
        }),
      }),
      env,
      noopContext,
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string; status: string };
    expect(created.status).toBe("active");

    // Two real reads through the real Worker — each should record its own
    // organization.viewed event (router.ts's getOrganization, EAP-4).
    for (let i = 0; i < 2; i += 1) {
      const getResponse = await worker.fetch(
        new Request(`https://example.com/api/organizations/${created.id}`, {
          headers: { cookie },
        }),
        env,
        noopContext,
      );
      expect(getResponse.status).toBe(200);
    }

    const archiveResponse = await worker.fetch(
      new Request(`https://example.com/api/organizations/${created.id}`, {
        method: "PATCH",
        headers: { cookie },
        body: JSON.stringify({ status: "archived" }),
      }),
      env,
      noopContext,
    );
    expect(archiveResponse.status).toBe(200);
    expect(((await archiveResponse.json()) as { status: string }).status).toBe("archived");

    const auditResponse = await worker.fetch(
      new Request(`https://example.com/api/audit?entityType=organization&entityId=${created.id}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    const events = (await auditResponse.json()) as Array<{ action: string }>;
    expect(events.filter((event) => event.action === "organization.viewed")).toHaveLength(2);
    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "organization.created",
        "organization.viewed",
        "organization.archived",
      ]),
    );

    // GET /api/organizations/search, filtered by the real archived status.
    const searchResponse = await worker.fetch(
      new Request("https://example.com/api/organizations/search?status=archived", {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(searchResponse.status).toBe(200);
    const searched = (await searchResponse.json()) as { total: number };
    expect(searched.total).toBe(1);

    // Organization Relationships: GET /api/leads/search?organizationId=... and
    // GET /api/assessments/search?organizationId=... find only records
    // actually linked to this organization, not every lead/assessment.
    await worker.fetch(
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
          organizationId: created.id,
        }),
      }),
      env,
      noopContext,
    );
    await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: dpdpV1.version,
          answers: { has_dpo: false },
          result: {
            score: 33,
            riskLevel: "medium",
            breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
          organizationId: created.id,
        }),
      }),
      env,
      noopContext,
    );

    const linkedLeadsResponse = await worker.fetch(
      new Request(`https://example.com/api/leads/search?organizationId=${created.id}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(linkedLeadsResponse.status).toBe(200);
    const linkedLeads = (await linkedLeadsResponse.json()) as { total: number };
    expect(linkedLeads.total).toBe(1);

    const linkedAssessmentsResponse = await worker.fetch(
      new Request(`https://example.com/api/assessments/search?organizationId=${created.id}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(linkedAssessmentsResponse.status).toBe(200);
    const linkedAssessments = (await linkedAssessmentsResponse.json()) as { total: number };
    expect(linkedAssessments.total).toBe(1);
  });

  it("EAP-5: wires a real env.DB through the Enterprise User Directory (search, get) and Role Assignment (grant/change/revoke) end to end", async () => {
    const env = { DB: createDb(), AUTH_SECRET: "test-secret" };
    const cookie = await createPlatformAdministratorCookie(env.DB);

    // A real second user, distinct from the Platform Administrator caller —
    // created the same way any real sign-in would populate the users table
    // (createTestCaller uses the real @auth/d1-adapter, not a fixture).
    const authConfig = createAuthConfig({ db: env.DB, secret: "test-secret" });
    const target = await createTestCaller(authConfig, {
      name: "Priya Sharma",
      email: "priya@acme.in",
    });

    const searchResponse = await worker.fetch(
      new Request("https://example.com/api/users/search?search=priya", { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(searchResponse.status).toBe(200);
    const searched = (await searchResponse.json()) as {
      total: number;
      users: Array<{ id: string }>;
    };
    expect(searched.total).toBe(1);
    expect(searched.users[0]?.id).toBe(target.userId);

    const getResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({
      id: target.userId,
      email: "priya@acme.in",
      profiles: [],
    });

    // Role Assignment's grant action, against a real organization.
    const orgResponse = await worker.fetch(
      new Request("https://example.com/api/organizations", {
        method: "POST",
        headers: { cookie, origin: "http://localhost:5173" },
        body: JSON.stringify({
          name: "Acme Fintech",
          slug: "acme-fintech",
          industry: null,
          region: null,
          tags: [],
          createdAt: "2026-07-20T00:00:00.000Z",
        }),
      }),
      env,
      noopContext,
    );
    expect(orgResponse.status).toBe(201);
    const org = (await orgResponse.json()) as { id: string };

    const grantResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}/profiles`, {
        method: "POST",
        headers: { cookie, origin: "http://localhost:5173" },
        body: JSON.stringify({ organizationId: org.id, role: "member" }),
      }),
      env,
      noopContext,
    );
    expect(grantResponse.status).toBe(201);
    const granted = (await grantResponse.json()) as { id: string; role: string };
    expect(granted.role).toBe("member");

    // Real D1 round trip, not just trusting the grant response.
    const rereadResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(await rereadResponse.json()).toMatchObject({
      profiles: [{ organizationId: org.id, role: "member" }],
    });

    // Role Assignment's change-role action.
    const changeResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}/profiles/${granted.id}`, {
        method: "PATCH",
        headers: { cookie, origin: "http://localhost:5173" },
        body: JSON.stringify({ role: "admin" }),
      }),
      env,
      noopContext,
    );
    expect(changeResponse.status).toBe(200);
    expect(await changeResponse.json()).toMatchObject({ role: "admin" });

    // Role Assignment's revoke action.
    const revokeResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}/profiles/${granted.id}`, {
        method: "DELETE",
        headers: { cookie, origin: "http://localhost:5173" },
      }),
      env,
      noopContext,
    );
    expect(revokeResponse.status).toBe(200);

    const finalReadResponse = await worker.fetch(
      new Request(`https://example.com/api/users/${target.userId}`, { headers: { cookie } }),
      env,
      noopContext,
    );
    expect(await finalReadResponse.json()).toMatchObject({ profiles: [] });

    // A single user's own real activity trail — user.viewed (x3, from the
    // three GETs above), user.role_granted, user.role_changed,
    // user.role_revoked — through the actual Worker, not a mock.
    const auditResponse = await worker.fetch(
      new Request(`https://example.com/api/audit?entityType=user&entityId=${target.userId}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    const events = (await auditResponse.json()) as Array<{ action: string }>;
    expect(events.filter((event) => event.action === "user.viewed")).toHaveLength(3);
    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining(["user.role_granted", "user.role_changed", "user.role_revoked"]),
    );

    // User Relationships: GET /api/assessments/search?createdBy=... finds
    // only assessments this specific user actually created.
    await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: dpdpV1.version,
          answers: { has_dpo: false },
          result: {
            score: 33,
            riskLevel: "medium",
            breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
          createdBy: target.userId,
        }),
      }),
      env,
      noopContext,
    );
    await worker.fetch(
      new Request("https://example.com/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          framework: "dpdp",
          frameworkVersion: dpdpV1.version,
          answers: { has_dpo: false },
          result: {
            score: 10,
            riskLevel: "low",
            breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
            gaps: [],
            scoredQuestionCount: 12,
          },
          createdAt: "2026-07-20T00:00:00.000Z",
          createdBy: "someone_else",
        }),
      }),
      env,
      noopContext,
    );

    const createdByResponse = await worker.fetch(
      new Request(`https://example.com/api/assessments/search?createdBy=${target.userId}`, {
        headers: { cookie },
      }),
      env,
      noopContext,
    );
    expect(createdByResponse.status).toBe(200);
    const createdByResult = (await createdByResponse.json()) as { total: number };
    expect(createdByResult.total).toBe(1);
  });
});

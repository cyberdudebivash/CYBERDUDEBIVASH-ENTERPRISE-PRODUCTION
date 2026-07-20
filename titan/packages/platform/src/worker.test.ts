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
});

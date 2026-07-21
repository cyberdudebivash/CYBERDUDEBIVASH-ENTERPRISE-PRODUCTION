import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-6: the Enterprise Audit Center driven through a real Chromium browser
 * against the real Worker + real local D1 — no mocks. Same rationale as
 * `organization-workspace.spec.ts`/`user-management.spec.ts` (this file's
 * siblings): jsdom-based component tests already cover the UI logic in
 * isolation, but only a real browser exercises real CORS/CSP/cookie
 * semantics and, specific to this module, a real file download
 * (`GET /api/audit/export`) — the one response shape in this app that isn't
 * JSON, and the one thing a mocked `fetch` in a component test can't
 * meaningfully verify end to end.
 *
 * `page.goto`/`page.reload` calls pass `waitUntil: "domcontentloaded"`, not
 * Playwright's own default (`"load"`) — same reasoning as the sibling
 * specs' own top comments.
 */
const PLATFORM_DIR = fileURLToPath(new URL("../../../packages/platform", import.meta.url));

function d1Execute(sql: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "titan-platform-db", "--local", "--command", sql],
    { cwd: PLATFORM_DIR, stdio: "pipe" },
  );
}

function seedSession(options: { email: string; platformAdministrator?: boolean }): {
  userId: string;
  cookie: string;
} {
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Audit Admin', '${options.email}', NULL)`,
  );
  d1Execute(
    `INSERT INTO sessions (id, "sessionToken", "userId", expires) VALUES ('${crypto.randomUUID()}', '${sessionToken}', '${userId}', '${expires}')`,
  );
  if (options.platformAdministrator) {
    d1Execute(
      `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${userId}', NULL, 'owner', '${new Date().toISOString()}')`,
    );
  }

  return { userId, cookie: `authjs.session-token=${sessionToken}` };
}

/** A real, directly-seeded audit event — the same "seed the row this
 * module's own real writers would have produced" pattern every sibling
 * spec's own `seedOrganization`/`seedLead` uses, not a fabricated shape:
 * columns match `migrations/0007_audit_events.sql` exactly. Timestamps are
 * generated fresh (`Date.now()`), same reasoning as this suite's other
 * specs — a hardcoded past date risks being pushed off the first page by
 * this shared, accumulating D1 instance's real event volume. */
function seedAuditEvent(options: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
}): void {
  const id = crypto.randomUUID();
  const actorValue = options.actorId ? `'${options.actorId}'` : "NULL";
  const metadataValue = options.metadata
    ? `'${JSON.stringify(options.metadata).replace(/'/g, "''")}'`
    : "NULL";
  d1Execute(
    `INSERT INTO audit_events (id, actor_id, organization_id, action, entity_type, entity_id, metadata_json, created_at) VALUES ('${id}', ${actorValue}, NULL, '${options.action}', '${options.entityType}', '${options.entityId}', ${metadataValue}, '${new Date().toISOString()}')`,
  );
}

test.describe("Enterprise Audit Center (EAP-6)", () => {
  test("redirects an unauthenticated visit to /admin/audit to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/audit",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-audit-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Audit Center" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Platform Administrator role required to view this."),
    ).toBeVisible();
  });

  test("a Platform Administrator finds a real seeded event via the entityType filter and opens its detail panel", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-audit-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const entityId = `e2e-audit-lead-${stamp}`;
    seedAuditEvent({
      entityType: "lead",
      entityId,
      action: "lead.created",
      metadata: { source: "dpdp-scan" },
    });

    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Audit Center" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("combobox", { name: "Entity type" }).selectOption("lead");
    const table = page.getByRole("table", { name: "Audit events" });
    await expect(table.getByRole("link", { name: "Lead" }).first()).toHaveAttribute(
      "href",
      `/admin/leads/${entityId}`,
      { timeout: 10_000 },
    );

    // Audit Details: open the just-seeded event's own detail panel and
    // confirm its real metadata renders — not fabricated, the exact JSON
    // this event was seeded with.
    await table
      .getByRole("button", { name: /\d{1,2}\/\d{1,2}\/\d{4}/ })
      .first()
      .click();
    await expect(page.getByRole("region", { name: "Audit event details" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/"source": "dpdp-scan"/)).toBeVisible();
    await expect(
      page.getByText("Not captured — this event log has no request id, IP, or user-agent column."),
    ).toBeVisible();
  });

  test("Investigation view groups real events by entity", async ({ page, context }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-audit-admin2-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const entityId = `e2e-audit-investigate-${stamp}`;
    seedAuditEvent({ entityType: "assessment", entityId, action: "assessment.created" });
    seedAuditEvent({ entityType: "assessment", entityId, action: "assessment.viewed" });

    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Audit Center" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("combobox", { name: "Entity type" }).selectOption("assessment");
    await expect(page.getByRole("table", { name: "Audit events" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Investigation" }).click();
    await expect(page.getByText(`Assessment ${entityId}`)).toBeVisible({ timeout: 10_000 });
  });

  test("exports a real CSV file respecting the current filter", async ({ page, context }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-audit-admin3-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const entityId = `e2e-audit-export-${stamp}`;
    seedAuditEvent({ entityType: "organization", entityId, action: "organization.created" });

    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Audit Center" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("combobox", { name: "Entity type" }).selectOption("organization");
    await expect(page.getByRole("table", { name: "Audit events" })).toBeVisible({
      timeout: 10_000,
    });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^audit-export-.*\.csv$/);
    const downloadPath = await download.path();
    const content = readFileSync(downloadPath!, "utf-8");
    expect(content).toContain("organization.created");
    expect(content).toContain(entityId);
  });
});

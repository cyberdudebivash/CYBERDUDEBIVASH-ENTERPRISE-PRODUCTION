import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-8: the Enterprise Reporting & Analytics module driven through a real
 * Chromium browser against the real Worker + real local D1 — no mocks. Same
 * rationale as `operations-center.spec.ts`/`audit-center.spec.ts` (this
 * file's siblings): jsdom-based component tests already cover the UI logic
 * in isolation, but only a real browser + real Worker isolate proves the
 * Executive Dashboard/Business Reports/Analytics reflect a real, freshly
 * seeded lead, and that Report Export (`GET /api/reports/export`) is a real
 * file download — the one response shape in this app that isn't JSON.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Reporting Admin', '${options.email}', NULL)`,
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

/** A real lead row created "now" — lands in today's Analytics bucket and
 * this run's own Executive Summary/Business Reports counts, the same
 * distinctive-but-real-data reasoning `lead-workspace.spec.ts`'s own
 * `seedLead` uses. */
function seedLead(options: { name: string; email: string; company: string }): string {
  const id = crypto.randomUUID();
  const result = {
    score: 40,
    riskLevel: "medium",
    breakdown: { critical: 0, high: 0, medium: 1, low: 11, total: 1 },
    gaps: [],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at, status, priority, assigned_to, tags_json) VALUES ('${id}', NULL, NULL, '${options.name}', '${options.email}', '${options.company}', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', 'dpdp-scan', '${new Date().toISOString()}', 'new', 'medium', NULL, '[]')`,
  );
  return id;
}

test.describe("Enterprise Reporting & Analytics (EAP-8)", () => {
  test("redirects an unauthenticated visit to /admin/reporting to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/reporting", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/reporting",
    );
  });

  test("shows an honest 'Platform Administrator role required' message for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-reporting-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/reporting", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Reporting & Analytics" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Platform Administrator role required to view this.").first(),
    ).toBeVisible();
  });

  test("a Platform Administrator sees a real Executive Dashboard, Business Reports, and Analytics reflecting a freshly seeded lead, and can export a real CSV", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-reporting-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    seedLead({
      name: `E2E Reporting Lead ${stamp}`,
      email: `lead-${stamp}@acme.in`,
      company: "Acme Fintech",
    });

    await page.goto("/admin/reporting", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Reporting & Analytics" })).toBeVisible({
      timeout: 10_000,
    });

    // Executive Dashboard: a real, non-placeholder Leads count — this run's
    // own seeded lead plus whatever else persists in the shared local D1
    // (admin-dashboard.spec.ts's own note: state isn't reset between runs).
    const executiveDashboard = page.getByRole("region", { name: "Executive Dashboard" });
    await expect(executiveDashboard.getByText("Leads")).toBeVisible({ timeout: 10_000 });
    const leadsValue = await executiveDashboard
      .locator(".titan-metric-card", { hasText: "Leads" })
      .locator(".titan-metric-card__value")
      .textContent();
    expect(Number(leadsValue)).toBeGreaterThanOrEqual(1);

    // Business Reports: a real breakdown table, with at least one "new"
    // status lead counted (this run's own seeded lead is status "new").
    const statusTable = page.getByRole("table", { name: "Leads by status" });
    await expect(statusTable.getByText("new")).toBeVisible({ timeout: 10_000 });
    const statusRow = statusTable.getByRole("row").filter({ hasText: "new" });
    const newCount = Number(await statusRow.locator("td").last().textContent());
    expect(newCount).toBeGreaterThanOrEqual(1);

    // Analytics: the default "Leads" entity/30-day window — today's row (the
    // table's last row, since the series runs oldest-to-newest) reflects
    // this run's own just-seeded lead.
    const trendTable = page.getByRole("table", { name: "Leads trend by day" });
    await expect(trendTable).toBeVisible({ timeout: 10_000 });
    const todayRow = trendTable.getByRole("row").last();
    const todayCount = Number(await todayRow.locator("td").last().textContent());
    expect(todayCount).toBeGreaterThanOrEqual(1);

    // Report Export: a real CSV file download, not a JSON envelope.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^reporting-summary-.*\.csv$/);
    const downloadPath = await download.path();
    const content = readFileSync(downloadPath!, "utf-8");
    expect(content).toContain("section,metric,value");
    expect(content).toContain("leads,total,");
  });
});

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-4: the Enterprise Organization Management Platform driven through a
 * real Chromium browser against the real Worker + real local D1 — no mocks.
 * Same rationale as `assessment-center.spec.ts`/`lead-workspace.spec.ts`
 * (this file's siblings): jsdom-based component tests already cover the UI
 * logic in isolation, but only a real browser exercises real CORS/CSP/
 * cookie semantics and a real create → search → filter → detail →
 * health/relationships/administration/audit round trip against the actual
 * server-side implementation, not a mocked `fetch`.
 *
 * `page.goto`/`page.reload` calls pass `waitUntil: "domcontentloaded"`, not
 * Playwright's own default (`"load"`) — same reasoning as the sibling
 * specs' own top comments (this sandbox's external Google Fonts request can
 * fail/stall the "load" event; every assertion here already waits on a
 * real, specific element instead).
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Organization Admin', '${options.email}', NULL)`,
  );
  d1Execute(
    `INSERT INTO sessions (id, "sessionToken", "userId", expires) VALUES ('${crypto.randomUUID()}', '${sessionToken}', '${userId}', '${expires}')`,
  );
  if (options.platformAdministrator) {
    d1Execute(
      `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${userId}', NULL, 'owner', '${new Date().toISOString()}')`,
    );
  }

  // Same non-`__Secure-` cookie name reasoning as the sibling specs:
  // wrangler dev serves plain HTTP locally.
  return { userId, cookie: `authjs.session-token=${sessionToken}` };
}

/** A real organization row, seeded directly (mirroring `seedAssessment` in
 * assessment-center.spec.ts) for the tests that need a pre-existing
 * organization to link data against or search for — the create flow itself
 * is exercised separately, through the real UI form. */
function seedOrganization(options: {
  name: string;
  slug: string;
  industry?: string | null;
  region?: string | null;
}): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const industryValue = options.industry ? `'${options.industry}'` : "NULL";
  const regionValue = options.region ? `'${options.region}'` : "NULL";
  d1Execute(
    `INSERT INTO organizations (id, name, slug, status, industry, region, tags_json, created_at, updated_at) VALUES ('${id}', '${options.name}', '${options.slug}', 'active', ${industryValue}, ${regionValue}, '[]', '${now}', '${now}')`,
  );
  return id;
}

function seedAssessmentForOrganization(
  organizationId: string,
  options: { score: number; riskLevel: "low" | "medium" | "high" | "critical" },
): string {
  const id = crypto.randomUUID();
  const result = {
    score: options.score,
    riskLevel: options.riskLevel,
    breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
    gaps: [],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO assessments (id, organization_id, created_by, framework, framework_version, answers_json, result_json, created_at) VALUES ('${id}', '${organizationId}', NULL, 'dpdp', '1.0.0', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', '${new Date().toISOString()}')`,
  );
  return id;
}

function seedLeadForOrganization(organizationId: string, name: string, email: string): string {
  const id = crypto.randomUUID();
  const result = {
    score: 50,
    riskLevel: "medium",
    breakdown: { critical: 0, high: 0, medium: 1, low: 11, total: 1 },
    gaps: [],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at, status, priority, assigned_to, tags_json) VALUES ('${id}', '${organizationId}', NULL, '${name}', '${email}', 'E2E Linked Co', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', 'dpdp-scan', '${new Date().toISOString()}', 'new', 'medium', NULL, '[]')`,
  );
  return id;
}

test.describe("Enterprise Organization Management Platform (EAP-4)", () => {
  test("redirects an unauthenticated visit to /admin/organizations to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/organizations",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-org-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Platform Administrator role required to view this."),
    ).toBeVisible();
  });

  test("a Platform Administrator creates an organization via the real form, finds it via search, and opens its detail page", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-org-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const orgName = `E2E Created Org ${stamp}`;

    await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "New organization" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill(orgName);
    // Identifier auto-slugs from the name — verified real, not asserted
    // blindly, before submitting.
    await expect(page.getByRole("textbox", { name: "Identifier (slug)" })).toHaveValue(
      new RegExp(`e2e-created-org-${stamp}`),
    );
    await page.getByRole("button", { name: "Create organization" }).click();

    // Real navigation into Organization Details on successful creation.
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible({ timeout: 10_000 });

    // Real server-side search from the Workspace finds exactly this
    // just-created organization.
    await page.getByRole("link", { name: "← Back to Organizations" }).click();
    await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search organizations" }).fill(orgName);
    const table = page.getByRole("table", { name: "Organizations" });
    await expect(table.getByRole("row")).toHaveCount(2, { timeout: 10_000 }); // header + 1 data row
    await expect(table.getByText("Active")).toBeVisible();

    await table.getByRole("link", { name: orgName }).click();
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible({ timeout: 10_000 });
  });

  test("Organization Details shows real health, relationships, administration (archive), and audit history", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-org-admin2-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const organizationId = seedOrganization({
      name: `E2E Health Org ${stamp}`,
      slug: `e2e-health-org-${stamp}`,
      industry: "Financial Services",
      region: "APAC",
    });
    seedAssessmentForOrganization(organizationId, { score: 88, riskLevel: "critical" });
    const linkedLeadName = `E2E Org Linked Lead ${stamp}`;
    seedLeadForOrganization(organizationId, linkedLeadName, `org-linked-${stamp}@example.com`);

    await page.goto(`/admin/organizations/${organizationId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: `E2E Health Org ${stamp}` })).toBeVisible({
      timeout: 10_000,
    });

    // Real Health, derived from the one real assessment just seeded. `exact:
    // true` (case-sensitive) distinguishes the "Current risk" badge's
    // "Critical" from the risk-distribution list's own real, lowercase
    // "critical" label (CSS-only capitalized) — Playwright's default,
    // non-exact getByText is case-insensitive and matched both.
    await expect(page.getByLabel("Health").getByText("Critical", { exact: true })).toBeVisible();
    await expect(page.getByText("Assessments on record")).toBeVisible();

    // Real Relationships — the seeded lead/assessment, deep-linked into
    // their own modules.
    const leadLink = page.getByRole("link", { name: linkedLeadName });
    await expect(leadLink).toBeVisible();

    // Real Administration: archiving is a real PATCH, reflected in the
    // heading's own status badge after the server round-trip.
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Real audit history: this organization's own real event trail —
    // created (via direct seed, so absent here), viewed (this page load),
    // and archived (the action just taken).
    await expect(page.getByText("Organization viewed").first()).toBeVisible();
    await expect(page.getByText("Organization archived")).toBeVisible();
  });
});

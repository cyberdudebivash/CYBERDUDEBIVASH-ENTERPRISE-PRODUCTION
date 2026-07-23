import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * CPP-1: the Enterprise Customer Portal driven through a real Chromium
 * browser against the real Worker + real local D1 — no mocks. Same
 * rationale as every sibling spec: jsdom-based component tests already
 * cover the UI logic in isolation, but only a real browser + real Worker
 * isolate proves the organization-scoping this module's entire security
 * model rests on — that a real caller only ever sees their *own*
 * organization's data, never another's, even when asked for it directly.
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

function seedSession(options: { email: string; organizationId?: string }): {
  userId: string;
  cookie: string;
} {
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Portal Customer', '${options.email}', NULL)`,
  );
  d1Execute(
    `INSERT INTO sessions (id, "sessionToken", "userId", expires) VALUES ('${crypto.randomUUID()}', '${sessionToken}', '${userId}', '${expires}')`,
  );
  if (options.organizationId) {
    d1Execute(
      `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${userId}', '${options.organizationId}', 'member', '${new Date().toISOString()}')`,
    );
  }

  return { userId, cookie: `authjs.session-token=${sessionToken}` };
}

function seedOrganization(options: { name: string; slug: string }): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d1Execute(
    `INSERT INTO organizations (id, name, slug, status, industry, region, tags_json, created_at, updated_at) VALUES ('${id}', '${options.name}', '${options.slug}', 'active', 'Financial Services', 'APAC', '[]', '${now}', '${now}')`,
  );
  return id;
}

function seedAssessmentForOrganization(
  organizationId: string,
  options: { riskLevel: "low" | "medium" | "high" | "critical" },
): string {
  const id = crypto.randomUUID();
  const result = {
    score: 40,
    riskLevel: options.riskLevel,
    breakdown: { critical: 0, high: 0, medium: 1, low: 11, total: 1 },
    gaps: [],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO assessments (id, organization_id, created_by, framework, framework_version, answers_json, result_json, created_at) VALUES ('${id}', '${organizationId}', NULL, 'dpdp', '1.0.0', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', '${new Date().toISOString()}')`,
  );
  return id;
}

test.describe("Enterprise Customer Portal (CPP-1)", () => {
  test("redirects an unauthenticated visit to /portal to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain("callbackUrl=http://localhost:5173/portal");
  });

  test("shows a real self-service 'create your organization' form for an authenticated caller with no organization profile, and using it grants real portal access", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-portal-solo-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Create your organization" })).toBeVisible({
      timeout: 10_000,
    });
    // The nav itself is empty too — hidden entirely, not shown-then-blocked.
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

    // The real fix this incident needed: submitting the form actually
    // provisions a real organization and grants real portal access,
    // not just a friendlier dead end.
    const stamp = Date.now();
    await page.getByLabel("Organization name").fill(`E2E Onboarding Org ${stamp}`);
    await page.getByRole("button", { name: "Create organization" }).click();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 10_000 });
  });

  test("a real organization member sees their own organization's Dashboard, Assessments, and Reports — and never another organization's data", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Portal Org ${stamp}`,
      slug: `e2e-portal-org-${stamp}`,
    });
    const otherOrg = seedOrganization({
      name: `E2E Portal Other Org ${stamp}`,
      slug: `e2e-portal-other-org-${stamp}`,
    });
    const ownAssessment = seedAssessmentForOrganization(ownOrg, { riskLevel: "critical" });
    const otherAssessment = seedAssessmentForOrganization(otherOrg, { riskLevel: "low" });

    const { cookie } = seedSession({
      email: `e2e-portal-member-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    // Dashboard: real Organization Overview + Compliance Summary reflecting
    // this session's own organization, never the other one.
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(`E2E Portal Org ${stamp}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(`E2E Portal Other Org ${stamp}`)).toHaveCount(0);

    // Assessments: only this organization's own assessment appears.
    await page.getByRole("link", { name: "Assessments" }).click();
    const assessmentsTable = page.getByRole("table", { name: "Your organization's assessments" });
    await expect(assessmentsTable).toBeVisible({ timeout: 10_000 });
    await expect(assessmentsTable.getByRole("row")).toHaveCount(2); // header + one real row

    // Cross-tenant isolation: this session's own assessment opens...
    await page.goto(`/portal/assessments/${ownAssessment}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Critical").first()).toBeVisible({ timeout: 10_000 });

    // ...but the *other* organization's assessment, reached directly by id,
    // does not — the real security property this whole module rests on.
    await page.goto(`/portal/assessments/${otherAssessment}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("This assessment is not available to your organization."),
    ).toBeVisible({ timeout: 10_000 });

    // Reports: a real, organization-scoped compliance report and a real
    // CSV export download.
    await page.goto("/portal/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("table", { name: "Assessments by risk level" })).toBeVisible({
      timeout: 10_000,
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^compliance-summary-.*\.csv$/);
  });

  test("a real organization member submits a support request and sees it in their own history", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Support Org ${stamp}`,
      slug: `e2e-support-org-${stamp}`,
    });
    const { cookie } = seedSession({
      email: `e2e-portal-support-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal/support", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("Subject").fill(`E2E request ${stamp}`);
    await page.getByLabel("Message").fill("Real message body from a real Chromium session.");
    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(page.getByText("Request submitted")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(`E2E request ${stamp}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("open").first()).toBeVisible();
  });
});

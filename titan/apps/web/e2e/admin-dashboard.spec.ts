import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-1: the admin app's authenticated shell and its one real module
 * (Dashboard) driven through a real Chromium browser against the real
 * Worker + real local D1 — no mocks. Session lifecycle
 * (sign-in-required-redirect, real cross-origin cookie flow, sign-out) is
 * exactly the surface a real browser is needed for: jsdom-based component
 * tests (DashboardPage.test.tsx, RequireAuth.test.tsx) already cover the
 * UI logic, but only a real browser enforces real CORS/CSP/cookie
 * semantics. This suite exists because doing exactly that, during this
 * feature's own real-browser verification, caught a genuine bug no unit
 * test or curl-based check could have: the CSP spec's `form-action`
 * directive also restricts *redirects resulting from* a form submission,
 * not just its immediate POST target, which silently broke the real
 * Auth.js sign-out confirmation page's cross-origin redirect back to this
 * app until `authPagesCsp` widened `form-action` to the admin app's own
 * origin (`http/finalizeResponse.ts`).
 *
 * `page.goto` calls below pass `waitUntil: "domcontentloaded"` (EAP-2) —
 * Playwright's own default (`"load"`) additionally blocks on this
 * sandbox's external Google Fonts request settling, which can be slow/
 * flaky through this environment's outbound proxy and isn't something any
 * assertion here actually depends on; every navigation is already followed
 * by a real, specific `expect(...).toBeVisible()`, which is what actually
 * proves the app loaded.
 */
const PLATFORM_DIR = fileURLToPath(new URL("../../../packages/platform", import.meta.url));

function d1Execute(sql: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "titan-platform-db", "--local", "--command", sql],
    { cwd: PLATFORM_DIR, stdio: "pipe" },
  );
}

interface D1QueryResult {
  results: Array<Record<string, unknown>>;
}

function d1Query(sql: string): Array<Record<string, unknown>> {
  const output = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "titan-platform-db", "--local", "--command", sql, "--json"],
    { cwd: PLATFORM_DIR, stdio: ["ignore", "pipe", "ignore"] },
  ).toString();
  const [result] = JSON.parse(output) as D1QueryResult[];
  return result!.results;
}

/** GET /api/leads (and this whole local D1 instance) is shared, persistent
 * state across every test/run in this suite — it is never reset between
 * runs (`OPERATIONAL_RUNBOOK.md`'s "Resetting local state" is opt-in, not
 * automatic). Asserting an absolute lead count would be genuinely fragile
 * for that reason, not just test-hygiene pedantry; asserting the count
 * increased by exactly what this test itself seeded is the correct check. */
function countLeads(): number {
  return Number(d1Query("SELECT COUNT(*) as count FROM leads")[0]?.count ?? 0);
}

/**
 * Seeds a real Auth.js user + session row directly in the same local D1
 * `wrangler dev` (this spec's `webServer`) reads from — the database
 * session strategy validates purely by looking up `sessionToken`
 * (verified directly against `@auth/core`'s session action, `auth/
 * session.test.ts`'s own comment), so a session created this way is
 * indistinguishable from one Auth.js's own sign-in flow would produce.
 * Bypasses the interactive magic-link UI (covered by manual real-browser
 * verification, `DECISION_LOG.md`) so this suite stays fast and
 * regression-focused on what changed for EAP-1, not a second copy of
 * Auth.js's own well-tested sign-in mechanics.
 */
function seedSession(options: { email: string; platformAdministrator?: boolean }): {
  userId: string;
  cookie: string;
} {
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Admin', '${options.email}', NULL)`,
  );
  d1Execute(
    `INSERT INTO sessions (id, "sessionToken", "userId", expires) VALUES ('${crypto.randomUUID()}', '${sessionToken}', '${userId}', '${expires}')`,
  );
  if (options.platformAdministrator) {
    d1Execute(
      `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${userId}', NULL, 'owner', '${new Date().toISOString()}')`,
    );
  }

  // wrangler dev serves plain HTTP locally, so Auth.js's useSecureCookies
  // (defaults to url.protocol === "https:") is false — the real cookie
  // name has no __Secure- prefix, confirmed against the real running
  // Worker during this feature's manual verification pass.
  return { userId, cookie: `authjs.session-token=${sessionToken}` };
}

test.describe("Admin shell and Dashboard (EAP-1)", () => {
  test("redirects an unauthenticated visit to /admin to the real Auth.js sign-in page, with a callback URL back to /admin", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(page.url()).toContain("localhost:8787");
    expect(decodeURIComponent(page.url())).toContain("callbackUrl=http://localhost:5173/admin");
  });

  test("renders real Dashboard data for a Platform Administrator, and real cross-origin sign-out actually ends the session", async ({
    page,
    context,
    baseURL,
  }) => {
    const email = `e2e-admin-${Date.now()}@titan.local`;
    const { cookie } = seedSession({ email, platformAdministrator: true });
    const [name, value] = cookie.split("=");

    const leadsBefore = countLeads();
    // Seed one real lead so the Dashboard's metrics/risk-distribution
    // sections have real, non-empty data to render and assert on.
    d1Execute(
      `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at) VALUES ('${crypto.randomUUID()}', NULL, NULL, 'Asha Rao', 'asha@acme.in', 'Acme Fintech', '{}', '{"score":80,"riskLevel":"critical","breakdown":{"critical":1,"high":0,"medium":0,"low":0,"total":1},"gaps":[],"scoredQuestionCount":12}', 'dpdp-scan', '${new Date().toISOString()}')`,
    );

    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(email)).toBeVisible();

    // Real data from the real seeded lead, not a fabricated/zero card.
    await expect(page.getByText("Platform Administrator role required to view this.")).toHaveCount(
      0,
    );
    const leadsCard = page.locator(".titan-metric-card").filter({ hasText: "Leads" });
    await expect(leadsCard.locator(".titan-metric-card__value")).toHaveText(
      String(leadsBefore + 1),
    );
    await expect(page.getByText("critical").first()).toBeVisible();

    // The real cross-origin sign-out flow — the exact path this feature's
    // real-browser verification found broken by a CSP form-action/redirect
    // interaction (see this file's own top comment) and fixed.
    await page.getByRole("link", { name: "Sign out" }).click();
    await page.waitForURL(/\/api\/auth\/signout/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /sign out/i }).click();
    // Waiting on the real redirect's landing content (the public Home page)
    // rather than an exact waitForURL string — the redirect completes fast
    // enough that a URL-pattern wait can race past its own navigation event.
    await expect(page.getByRole("heading", { name: "Titan platform foundation" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(`${baseURL}/`);

    const meAfterSignout = await page.evaluate(async () => {
      const res = await fetch("http://localhost:8787/api/me", { credentials: "include" });
      return res.status;
    });
    expect(meAfterSignout).toBe(401);
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Platform Administrator role required to view this.").first(),
    ).toBeVisible();
  });
});

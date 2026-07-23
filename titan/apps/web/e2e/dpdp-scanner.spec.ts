import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * The DPDP Compliance Scanner's real payment gate, driven through a real
 * Chromium browser against the real Worker + real local D1 — same
 * no-mocks rationale as every sibling spec (commercial-platform.spec.ts's
 * own top comment).
 *
 * This sandbox has never had real Razorpay credentials in any environment
 * (DECISION_LOG.md, commercial/razorpay.ts's own doc comment) — `.dev.vars`
 * here has no RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET, so the real, honest
 * behavior to prove is the real "not configured" failure the checkout route
 * returns, not a fabricated successful Razorpay round trip. The "payment
 * already verified" scenario is instead reached by seeding a real, paid
 * `billing_transactions` row directly in D1 — proving the real access-gate
 * query and the real scan-and-save path end to end, without depending on
 * Razorpay's own external checkout widget (which no CI/sandboxed browser
 * can drive without a real Razorpay test account).
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Scanner Customer', '${options.email}', NULL)`,
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

/** Seeds a real `active` subscription with a real, verified `paid`
 * billing_transactions row — the exact state `hasVerifiedDpdpScannerAccess`
 * (router.ts) checks for, reached here without a real Razorpay checkout. */
function seedPaidScannerAccess(organizationId: string, planId: string): void {
  const subscriptionId = crypto.randomUUID();
  const now = new Date().toISOString();
  d1Execute(
    `INSERT INTO subscriptions (id, organization_id, plan_id, status, trial_ends_at, current_period_end, created_at, updated_at, canceled_at) VALUES ('${subscriptionId}', '${organizationId}', '${planId}', 'active', NULL, '${now}', '${now}', '${now}', NULL)`,
  );
  const licenseId = crypto.randomUUID();
  d1Execute(
    `INSERT INTO licenses (id, organization_id, subscription_id, seat_limit, status, activated_at, expires_at, created_at, updated_at) VALUES ('${licenseId}', '${organizationId}', '${subscriptionId}', 10, 'active', '${now}', NULL, '${now}', '${now}')`,
  );
  const transactionId = crypto.randomUUID();
  d1Execute(
    `INSERT INTO billing_transactions (id, organization_id, subscription_id, plan_id, provider, provider_order_id, provider_payment_id, provider_signature, amount_paise, currency, status, created_at, updated_at) VALUES ('${transactionId}', '${organizationId}', '${subscriptionId}', '${planId}', 'razorpay', 'order_e2e_${transactionId}', 'pay_e2e_${transactionId}', 'sig_e2e', 999900, 'INR', 'paid', '${now}', '${now}')`,
  );
}

test.describe("DPDP Compliance Scanner", () => {
  test("shows the premium scanner card near the top of the Dashboard", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Scanner Dashboard Org ${stamp}`,
      slug: `e2e-scanner-dashboard-org-${stamp}`,
    });
    const { cookie } = seedSession({
      email: `e2e-scanner-dashboard-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Premium feature")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "DPDP Compliance Scanner" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unlock the scanner →" })).toHaveAttribute(
      "href",
      "/portal/dpdp-scanner",
    );
  });

  test("a real organization with no payment sees the paywall, and unlocking fails honestly (no Razorpay credentials configured in this environment)", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Scanner Paywall Org ${stamp}`,
      slug: `e2e-scanner-paywall-org-${stamp}`,
    });
    const { cookie } = seedSession({
      email: `e2e-scanner-paywall-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal/dpdp-scanner", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Unlock the DPDP Compliance Scanner" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Unlock with Starter" })).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/portal/commercial/razorpay/orders") &&
          res.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Unlock with Starter" }).click(),
    ]);

    // The real, honest failure this environment actually produces — see
    // this file's own top comment. Not a fabricated Razorpay success.
    expect(response.status()).toBe(503);
    await expect(page.getByText("Could not complete checkout")).toBeVisible({ timeout: 10_000 });
  });

  test("an organization with a real, verified payment runs a real scan, which is saved and shows up in their assessment history", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Scanner Paid Org ${stamp}`,
      slug: `e2e-scanner-paid-org-${stamp}`,
    });
    seedPaidScannerAccess(ownOrg, "starter");
    const { cookie } = seedSession({
      email: `e2e-scanner-paid-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal/dpdp-scanner", { waitUntil: "domcontentloaded" });

    // Real proof of the real gate: this organization has a verified paid
    // transaction, so it lands directly on the scanner, not the paywall.
    await expect(page.getByRole("button", { name: "Start scan" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Start scan" }).click();
    await expect(page.getByRole("heading", { name: "DPDP Compliance Risk Scanner" })).toBeVisible();

    const questionCount = 15;
    for (let i = 0; i < questionCount; i++) {
      const textbox = page.getByRole("textbox");
      if (await textbox.count()) {
        await textbox.fill("Acme Fintech, 25 employees");
      } else {
        await page.getByRole("radio", { name: "No, we do not have this in place" }).click();
      }
      const isLast = i === questionCount - 1;
      await page.getByRole("button", { name: isLast ? "Get My Report" : "Next" }).click();
    }

    const [scanResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/portal/dpdp-scanner/scan") && res.request().method() === "POST",
      ),
    ]);
    expect(scanResponse.status()).toBe(201);
    const saved = (await scanResponse.json()) as { id: string };

    await expect(page.getByText(/Risk score: \d+ out of 100/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "View saved result" })).toHaveAttribute(
      "href",
      `/portal/assessments/${saved.id}`,
    );

    // The real property this test exists for: the paid scan is not a new
    // kind of record — it's a real row in the same AssessmentRepository the
    // pre-existing Assessments page already reads from (CPP-1), so it shows
    // up there with zero new history/search UI. That page links each row by
    // its formatted date (PortalAssessmentsPage.tsx), not by id — asserting
    // on the real href is what actually proves it's the same record, rather
    // than guessing at the visible date text.
    await page.getByRole("link", { name: "View full history" }).click();
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`a[href="/portal/assessments/${saved.id}"]`)).toBeVisible();
  });
});

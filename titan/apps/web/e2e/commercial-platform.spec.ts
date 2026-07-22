import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * COM-1: the Enterprise Commercial Platform driven through a real Chromium
 * browser against the real Worker + real local D1 — no mocks. Same
 * rationale as every sibling spec: jsdom-based component tests already
 * cover the UI logic in isolation, but only a real browser + real Worker
 * proves the two properties this module's own security model rests on —
 * that a customer's self-service subscribe/cancel/renew actually persists
 * through a real `wrangler dev` round trip, and that a Platform
 * Administrator's override (assigning the sales-assisted "enterprise" plan
 * directly) works exactly where the customer-facing path deliberately
 * refuses to.
 *
 * `page.goto`/`page.reload` calls pass `waitUntil: "domcontentloaded"`, not
 * Playwright's own default (`"load"`) — same reasoning as every sibling
 * spec's own top comment.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Commercial Customer', '${options.email}', NULL)`,
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

function seedPlatformAdministratorSession(email: string): { userId: string; cookie: string } {
  const session = seedSession({ email });
  d1Execute(
    `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${session.userId}', NULL, 'owner', '${new Date().toISOString()}')`,
  );
  return session;
}

function seedOrganization(options: { name: string; slug: string }): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d1Execute(
    `INSERT INTO organizations (id, name, slug, status, industry, region, tags_json, created_at, updated_at) VALUES ('${id}', '${options.name}', '${options.slug}', 'active', 'Financial Services', 'APAC', '[]', '${now}', '${now}')`,
  );
  return id;
}

function seedSubscription(
  organizationId: string,
  options: { planId: string; status: string },
): { subscriptionId: string } {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d1Execute(
    `INSERT INTO subscriptions (id, organization_id, plan_id, status, trial_ends_at, current_period_end, created_at, updated_at, canceled_at) VALUES ('${id}', '${organizationId}', '${options.planId}', '${options.status}', NULL, '${now}', '${now}', '${now}', NULL)`,
  );
  const licenseId = crypto.randomUUID();
  d1Execute(
    `INSERT INTO licenses (id, organization_id, subscription_id, seat_limit, status, activated_at, expires_at, created_at, updated_at) VALUES ('${licenseId}', '${organizationId}', '${id}', 10, 'active', '${now}', NULL, '${now}', '${now}')`,
  );
  return { subscriptionId: id };
}

test.describe("Enterprise Commercial Platform (COM-1)", () => {
  test("redirects an unauthenticated visit to /portal/subscription to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/portal/subscription", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/portal/subscription",
    );
  });

  test("a real organization member with no subscription sees real plans, subscribes, and sees it reflected", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Commercial Org ${stamp}`,
      slug: `e2e-commercial-org-${stamp}`,
    });
    const { cookie } = seedSession({
      email: `e2e-commercial-member-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal/subscription", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("Your organization does not have an active subscription yet."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();

    await page.getByRole("button", { name: "Start Starter trial" }).click();

    await expect(page.getByRole("heading", { name: "Current plan" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Trialing")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel subscription" })).toBeVisible();
  });

  test("a real organization member cancels and then renews their own subscription", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const ownOrg = seedOrganization({
      name: `E2E Commercial Cancel Org ${stamp}`,
      slug: `e2e-commercial-cancel-org-${stamp}`,
    });
    seedSubscription(ownOrg, { planId: "professional", status: "active" });
    const { cookie } = seedSession({
      email: `e2e-commercial-cancel-${stamp}@titan.local`,
      organizationId: ownOrg,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/portal/subscription", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Professional" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Cancel subscription" }).click();
    await expect(page.getByRole("button", { name: "Renew subscription" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Renew subscription" }).click();
    await expect(page.getByRole("button", { name: "Cancel subscription" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("a Platform Administrator reviews real subscriptions across organizations and assigns the sales-assisted enterprise plan directly", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const orgA = seedOrganization({
      name: `E2E Commercial Admin Org A ${stamp}`,
      slug: `e2e-commercial-admin-org-a-${stamp}`,
    });
    const orgB = seedOrganization({
      name: `E2E Commercial Admin Org B ${stamp}`,
      slug: `e2e-commercial-admin-org-b-${stamp}`,
    });
    seedSubscription(orgA, { planId: "starter", status: "active" });
    const { subscriptionId } = seedSubscription(orgB, { planId: "professional", status: "active" });
    const { cookie } = seedPlatformAdministratorSession(
      `e2e-commercial-admin-${stamp}@titan.local`,
    );
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/commercial", { waitUntil: "domcontentloaded" });
    const table = page.getByRole("table", { name: "Subscriptions" });
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: orgA })).toBeVisible();
    await expect(page.getByRole("link", { name: orgB })).toBeVisible();

    await page.getByRole("link", { name: orgB }).click();
    await expect(page.getByRole("heading", { name: "Professional" })).toBeVisible({
      timeout: 10_000,
    });
    expect(page.url()).toContain(`/admin/commercial/${subscriptionId}`);

    // The real property this test exists for: a customer can never
    // self-service into "enterprise" (proven in router.test.ts and the
    // Customer Portal's own PortalSubscriptionPage tests, which never even
    // render a start button for it) — but a Platform Administrator can
    // assign it directly here.
    await page.getByLabel("Assign plan").selectOption("enterprise");
    await expect(page.getByRole("heading", { name: "Enterprise" })).toBeVisible({
      timeout: 10_000,
    });
  });
});

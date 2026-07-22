import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-7: the Enterprise Operations Center driven through a real Chromium
 * browser against the real Worker + real local D1 — no mocks. Same
 * rationale as `audit-center.spec.ts`/`user-management.spec.ts` (this
 * file's siblings): jsdom-based component tests already cover the UI logic
 * in isolation, but only a real browser + real Worker isolate proves the
 * runtime-metrics counters (`observability/metrics.ts`) that back this
 * module's own "Runtime metrics" panel are actually real, accumulating
 * signal from real requests this test itself sends — not a fabricated
 * number a mocked `fetch` could return regardless of what really happened.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Operations Admin', '${options.email}', NULL)`,
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

test.describe("Enterprise Operations Center (EAP-7)", () => {
  test("redirects an unauthenticated visit to /admin/operations to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/operations", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/operations",
    );
  });

  test("shows real role-agnostic health/readiness plus an honest 'Platform Administrator role required' message for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-ops-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/operations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/titan-platform: ok/)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Platform Administrator role required to view this.").first(),
    ).toBeVisible();
  });

  test("a Platform Administrator sees real service status, real runtime metrics accumulated by this test's own requests, and an honest system overview", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-ops-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    // A real prior request against this same Worker isolate — the exact
    // signal Runtime Metrics claims to surface, not a number this test
    // fabricates and then asserts on right back.
    await page.request.get("http://localhost:8787/api/audit", {
      headers: { cookie },
    });

    await page.goto("/admin/operations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible({
      timeout: 10_000,
    });

    // Service Status: real per-repository reads, not a static "all green" board.
    const serviceTable = page.getByRole("table", { name: "Service status" });
    await expect(serviceTable.getByText("Lead Platform")).toBeVisible({ timeout: 10_000 });
    await expect(serviceTable.getByText("Operational").first()).toBeVisible();

    // Runtime Metrics: this isolate has served real GET requests by now
    // (this test's own /api/audit call above, plus /api/me, /health, etc.
    // the page itself just made) — a real, non-empty request-counts table,
    // several distinct rows (one per method/path/status combination), not
    // just one.
    const requestCountsTable = page.getByRole("table", { name: "Request counts" });
    await expect(requestCountsTable.getByText("GET").first()).toBeVisible({ timeout: 10_000 });
    expect(await requestCountsTable.getByText("GET").count()).toBeGreaterThan(1);

    // System Overview: real, static, verifiable facts.
    await expect(page.getByText("0.1.0")).toBeVisible();
    await expect(page.getByText(/local development/)).toBeVisible();

    // Background Operations: an honest note, not a fabricated queue view.
    await expect(
      page.getByText(
        "No background job, queue, or scheduled-task infrastructure exists in this deployment.",
        { exact: false },
      ),
    ).toBeVisible();

    // OPS-1: this real local Worker's genuine request volume/latency never
    // breaches any documented threshold, so both the Alerts panel and the
    // summary banner report a real, computed "healthy" — not fabricated.
    await expect(page.getByText("Healthy — no alerts firing")).toBeVisible();
    await expect(page.getByText("No alerts firing")).toBeVisible();

    // Request health: real error-rate/latency percentiles computed from
    // this isolate's own accumulated requests (never zero here — the page
    // load and this test's own /api/audit call both landed on it).
    await expect(page.getByText("Request health")).toBeVisible();
    await expect(page.getByText(/p95 latency/)).toBeVisible();
  });
});

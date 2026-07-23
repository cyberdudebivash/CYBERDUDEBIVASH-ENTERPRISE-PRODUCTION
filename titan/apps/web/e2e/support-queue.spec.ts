import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * Admin Support Queue (2026-07-23 production-readiness audit,
 * DECISION_LOG.md's Workstream 15) driven through a real Chromium browser
 * against the real Worker + real local D1 — no mocks. Same rationale as
 * every sibling spec (lead-workspace.spec.ts's own top comment): a real
 * search → filter → resolve/reopen round trip against the actual
 * server-side implementation, not a mocked `fetch`.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Support Admin', '${options.email}', NULL)`,
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

/** A real support_request row, submitted by a real (separate) customer
 * user — created_by is a real FK into users, not a fabricated id. */
function seedSupportRequest(options: { subject: string; message: string; email: string }): string {
  const requesterId = crypto.randomUUID();
  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${requesterId}', 'E2E Support Customer', '${options.email}', NULL)`,
  );
  const id = crypto.randomUUID();
  d1Execute(
    `INSERT INTO support_requests (id, organization_id, created_by, subject, message, status, created_at) VALUES ('${id}', NULL, '${requesterId}', '${options.subject.replace(/'/g, "''")}', '${options.message.replace(/'/g, "''")}', 'open', '${new Date().toISOString()}')`,
  );
  return id;
}

test.describe("Admin Support Queue", () => {
  test("redirects an unauthenticated visit to /admin/support-requests to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/support-requests", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/support-requests",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-support-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/support-requests", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Support Requests" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Platform Administrator role required to view this."),
    ).toBeVisible();
  });

  test("a Platform Administrator finds a real support request via search and marks it resolved, which persists across a reload", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-support-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const uniqueSubject = `Cannot export DPDP report ${stamp}`;
    seedSupportRequest({
      subject: uniqueSubject,
      message: "The export button spins but no file downloads.",
      email: `e2e-support-customer-${stamp}@titan.local`,
    });

    await page.goto("/admin/support-requests", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Support Requests" })).toBeVisible({
      timeout: 10_000,
    });

    // Real server-side search — narrows to exactly the one seeded request.
    await page.getByRole("searchbox", { name: "Search support requests" }).fill(uniqueSubject);
    const table = page.getByRole("table", { name: "Support Requests" });
    await expect(table.getByRole("row")).toHaveCount(2, { timeout: 10_000 }); // header + 1 data row
    const row = table.getByRole("row", { name: new RegExp(uniqueSubject) });
    await expect(row.getByText("Open")).toBeVisible();

    // Real PATCH /api/support-requests/:id through the real Worker.
    await row.getByRole("button", { name: "Mark resolved" }).click();
    await expect(row.getByText("Resolved")).toBeVisible({ timeout: 10_000 });
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();

    // Real persistence: a fresh navigation + re-search re-fetches from the
    // server, not from any client-side cache.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: "Search support requests" }).fill(uniqueSubject);
    const reloadedRow = page
      .getByRole("table", { name: "Support Requests" })
      .getByRole("row", { name: new RegExp(uniqueSubject) });
    await expect(reloadedRow.getByText("Resolved")).toBeVisible({ timeout: 10_000 });
  });
});

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-5: the Enterprise Identity & User Management module driven through a
 * real Chromium browser against the real Worker + real local D1 — no mocks.
 * Same rationale as `organization-workspace.spec.ts`/`assessment-center.spec.ts`
 * (this file's siblings): jsdom-based component tests already cover the UI
 * logic in isolation, but only a real browser exercises real CORS/CSP/cookie
 * semantics — load-bearing here specifically because this module introduces
 * this codebase's first-ever `DELETE` request (Role Assignment's revoke
 * action), the exact class of change (a new HTTP method) that silently broke
 * `PATCH /api/leads/:id` in EAP-2 until real-browser verification caught a
 * missing CORS `Access-Control-Allow-Methods` entry — fixed proactively this
 * time (`http/cors.ts`), verified here rather than assumed safe.
 *
 * `page.goto`/`page.reload` calls pass `waitUntil: "domcontentloaded"`, not
 * Playwright's own default (`"load"`) — same reasoning as the sibling specs'
 * own top comments (this sandbox's external Google Fonts request can
 * fail/stall the "load" event; every assertion here already waits on a real,
 * specific element instead).
 */
const PLATFORM_DIR = fileURLToPath(new URL("../../../packages/platform", import.meta.url));

function d1Execute(sql: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "titan-platform-db", "--local", "--command", sql],
    { cwd: PLATFORM_DIR, stdio: "pipe" },
  );
}

function seedSession(options: { email: string; name?: string; platformAdministrator?: boolean }): {
  userId: string;
  cookie: string;
} {
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', '${options.name ?? "E2E User"}', '${options.email}', NULL)`,
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

/** A real user with no session of their own — just a row in `users`, the
 * same way a real sign-in via any provider would create one, but without
 * needing that user to ever actually authenticate for this spec's purposes
 * (only the Platform Administrator caller needs a real session). */
function seedUser(options: { name: string; email: string }): string {
  const userId = crypto.randomUUID();
  d1Execute(
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', '${options.name}', '${options.email}', NULL)`,
  );
  return userId;
}

function seedOrganization(options: { name: string; slug: string }): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d1Execute(
    `INSERT INTO organizations (id, name, slug, status, industry, region, tags_json, created_at, updated_at) VALUES ('${id}', '${options.name}', '${options.slug}', 'active', NULL, NULL, '[]', '${now}', '${now}')`,
  );
  return id;
}

test.describe("Enterprise Identity & User Management (EAP-5)", () => {
  test("redirects an unauthenticated visit to /admin/users to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/users",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-user-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Platform Administrator role required to view this."),
    ).toBeVisible();
  });

  test("a Platform Administrator finds a real user via search and opens their detail page", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-user-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const targetName = `E2E Search Target ${stamp}`;
    seedUser({ name: targetName, email: `e2e-search-target-${stamp}@titan.local` });

    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("searchbox", { name: "Search users" }).fill(targetName);
    const table = page.getByRole("table", { name: "Users" });
    await expect(table.getByRole("row")).toHaveCount(2, { timeout: 10_000 }); // header + 1 data row

    await table.getByRole("link", { name: targetName }).click();
    await expect(page.getByRole("heading", { name: targetName })).toBeVisible({ timeout: 10_000 });
  });

  test("User Details shows real identity, grants/changes/revokes a role via Role Assignment, and records real audit history", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-user-admin2-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const targetName = `E2E Role Target ${stamp}`;
    const targetUserId = seedUser({
      name: targetName,
      email: `e2e-role-target-${stamp}@titan.local`,
    });
    const orgName = `E2E Role Org ${stamp}`;
    seedOrganization({ name: orgName, slug: `e2e-role-org-${stamp}` });

    await page.goto(`/admin/users/${targetUserId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: targetName })).toBeVisible({ timeout: 10_000 });

    // Real identity fields — this page's own View (user.viewed, recorded
    // on this exact load).
    await expect(page.getByText(`e2e-role-target-${stamp}@titan.local`)).toBeVisible();

    // Grant: a real POST /api/users/:id/profiles against the real org just
    // seeded above.
    await page.getByRole("combobox", { name: "Organization" }).selectOption({ label: orgName });
    await page.getByRole("combobox", { name: "Role" }).selectOption("member");
    await page.getByRole("button", { name: "Grant role" }).click();
    // Scoped to the profile row's own org-name span, not page text generally
    // — the grant-form's own <option> also legitimately contains this text.
    await expect(page.locator(".titan-role-assignment__org-name")).toHaveText(orgName, {
      timeout: 10_000,
    });

    // Change: a real PATCH /api/users/:id/profiles/:profileId, reflected
    // after the server round-trip, not an optimistic local-only update.
    // Asserted via the select's own value, not page text — "Admin" also
    // legitimately renders as the Breadcrumbs "Admin" link and as the
    // grant-form's own <option>, the same class of real dual-rendering
    // this project's component tests have hit repeatedly.
    const roleSelect = page.getByRole("combobox", { name: `Change role for ${orgName}` });
    await roleSelect.selectOption("admin");
    await expect(roleSelect).toHaveValue("admin", { timeout: 10_000 });
    // Confirms the value survived a real server round-trip, not just the
    // optimistic <select> DOM state — reload and re-check.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: targetName })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("combobox", { name: `Change role for ${orgName}` })).toHaveValue(
      "admin",
    );

    // Revoke: a real DELETE /api/users/:id/profiles/:profileId — this
    // codebase's first real deletion, and its first real DELETE request;
    // this is the exact request a missing CORS Access-Control-Allow-Methods
    // entry would silently block client-side (see this file's own top
    // comment).
    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(
      page.getByText("This user has no organization or platform roles yet."),
    ).toBeVisible({
      timeout: 10_000,
    });

    // Real audit history: viewed, role_granted, role_changed, role_revoked
    // — this user's own real trail.
    await expect(page.getByText("User viewed").first()).toBeVisible();
    await expect(page.getByText("Role granted")).toBeVisible();
    await expect(page.getByText("Role changed")).toBeVisible();
    await expect(page.getByText("Role revoked")).toBeVisible();
  });
});

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-2: the Lead Intelligence Platform driven through a real Chromium
 * browser against the real Worker + real local D1 — no mocks. Same
 * rationale as `admin-dashboard.spec.ts` (this file's sibling): jsdom-based
 * component tests already cover the UI logic in isolation, but only a real
 * browser exercises real CORS/CSP/cookie semantics and a real
 * search → filter → sort → paginate → detail → lifecycle-update round trip
 * against the actual server-side implementation, not a mocked `fetch`.
 *
 * Every `page.goto`/`page.reload` below passes `waitUntil:
 * "domcontentloaded"` explicitly, not Playwright's own default (`"load"`).
 * The app's own real network requests are never waited on implicitly
 * either way — every assertion after a navigation already waits on a real,
 * specific element via an auto-retrying `expect(...)`, which is what
 * actually proves the app loaded, not the browser's "load" event. `"load"`
 * additionally blocks on this sandbox's external Google Fonts request
 * settling (verified directly: `net::ERR_CONNECTION_RESET` observed
 * against it during this suite's own real-browser debugging) — a
 * cosmetic, non-blocking resource this app already tolerates failing
 * (`ARCHITECTURE.md`'s own note on this sandbox's restricted egress), not
 * a real signal of the page being ready.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Lead Admin', '${options.email}', NULL)`,
  );
  d1Execute(
    `INSERT INTO sessions (id, "sessionToken", "userId", expires) VALUES ('${crypto.randomUUID()}', '${sessionToken}', '${userId}', '${expires}')`,
  );
  if (options.platformAdministrator) {
    d1Execute(
      `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at) VALUES ('${crypto.randomUUID()}', '${userId}', NULL, 'owner', '${new Date().toISOString()}')`,
    );
  }

  // Same non-`__Secure-` cookie name reasoning as admin-dashboard.spec.ts:
  // wrangler dev serves plain HTTP locally.
  return { userId, cookie: `authjs.session-token=${sessionToken}` };
}

/** A real lead row with a distinctive, per-run-unique name/email so this
 * suite's own seeded data is always identifiable against whatever other
 * leads persist in the shared local D1 instance across runs
 * (`admin-dashboard.spec.ts`'s own comment explains why state isn't reset
 * between runs). */
function seedLead(options: {
  name: string;
  email: string;
  company: string;
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  status?: string;
}): string {
  const id = crypto.randomUUID();
  const result = {
    score: options.score,
    riskLevel: options.riskLevel,
    breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
    gaps: [
      {
        questionId: "has_dpo",
        question: "Do you have a DPO?",
        level: "critical",
        penalty: "₹250 crore",
      },
    ],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at, status, priority, assigned_to, tags_json) VALUES ('${id}', NULL, NULL, '${options.name}', '${options.email}', '${options.company}', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', 'dpdp-scan', '${new Date().toISOString()}', '${options.status ?? "new"}', 'medium', NULL, '[]')`,
  );
  return id;
}

test.describe("Lead Intelligence Platform (EAP-2)", () => {
  test("redirects an unauthenticated visit to /admin/leads to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/leads",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-lead-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Platform Administrator role required to view this."),
    ).toBeVisible();
  });

  test("real search, filter, and detail navigation for a Platform Administrator", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-lead-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    // Both leads' names are stamped, not just their email/company — this
    // suite's own D1 state is never reset between runs (this file's top
    // comment), so a fixed name like "Rahul Verma" reused run after run
    // would make "is this name absent from the filtered results" a
    // genuinely ambiguous assertion by the tenth run, not a flaky one.
    const uniqueCompany = `Zenith Robotics ${stamp}`;
    const includedName = `Priya Iyer ${stamp}`;
    const excludedName = `Rahul Verma ${stamp}`;
    seedLead({
      name: includedName,
      email: `priya-${stamp}@zenith.example`,
      company: uniqueCompany,
      score: 88,
      riskLevel: "critical",
      status: "qualified",
    });
    seedLead({
      name: excludedName,
      email: `rahul-${stamp}@other.example`,
      company: "Other Co",
      score: 10,
      riskLevel: "low",
    });

    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible({ timeout: 10_000 });

    // Real server-side search — narrows to exactly the one seeded lead.
    // Waited for via the table's own row count, not just "the row I want
    // exists" — that alone can't distinguish "search filtered correctly"
    // from "search hasn't taken effect yet and everything is still shown".
    await page.getByRole("searchbox", { name: "Search leads" }).fill(uniqueCompany);
    const table = page.getByRole("table", { name: "Leads" });
    await expect(table.getByRole("row")).toHaveCount(2, { timeout: 10_000 }); // header + 1 data row
    const row = table.getByRole("row", { name: new RegExp(uniqueCompany) });
    await expect(row).toBeVisible();
    await expect(row.getByText("Qualified")).toBeVisible();
    await expect(row.getByText("Critical")).toBeVisible();
    await expect(page.getByText(excludedName)).toHaveCount(0);

    // Real navigation into Lead Details.
    await row.getByRole("link", { name: includedName }).click();
    await expect(page.getByRole("heading", { name: includedName })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("88 / 100")).toBeVisible();
    await expect(page.getByText("Do you have a DPO?")).toBeVisible();
  });

  test("a real lifecycle update (status change) persists across a reload and appears in the audit trail", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-lead-admin2-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const leadId = seedLead({
      name: "Vikram Shah",
      email: `vikram-${stamp}@acme.example`,
      company: `Acme Robotics ${stamp}`,
      score: 55,
      riskLevel: "medium",
    });

    await page.goto(`/admin/leads/${leadId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Vikram Shah" })).toBeVisible({
      timeout: 10_000,
    });

    // Real PATCH /api/leads/:id through the real Worker.
    await page.getByRole("combobox", { name: "Status" }).selectOption("qualified");
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("qualified", {
      timeout: 10_000,
    });

    // Real persistence: a fresh navigation re-fetches from the server, not
    // from any client-side cache — this would show "new" again if the
    // PATCH hadn't actually reached D1.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("qualified", {
      timeout: 10_000,
    });

    // The real audit trail records the change, with the real caller as actor.
    await expect(page.getByText("Status changed")).toBeVisible();
    await expect(page.getByText("new → qualified")).toBeVisible();
  });
});

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * EAP-3: the Enterprise Assessment Center driven through a real Chromium
 * browser against the real Worker + real local D1 — no mocks. Same
 * rationale as `lead-workspace.spec.ts`/`admin-dashboard.spec.ts` (this
 * file's siblings): jsdom-based component tests already cover the UI logic
 * in isolation, but only a real browser exercises real CORS/CSP/cookie
 * semantics and a real search → filter → sort → paginate → detail →
 * audit/lead-linkage round trip against the actual server-side
 * implementation, not a mocked `fetch`.
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
    `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${userId}', 'E2E Assessment Admin', '${options.email}', NULL)`,
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

/** A real assessment row with a distinctive, per-run-unique `createdBy` so
 * this suite's own seeded data is always identifiable against whatever
 * other assessments persist in the shared local D1 instance across runs
 * (`admin-dashboard.spec.ts`'s own comment explains why state isn't reset
 * between runs) — searching/filtering by risk level alone would otherwise
 * accumulate matches run after run, the same class of issue EAP-2's
 * original "Rahul Verma" name collision taught this suite to avoid. */
function seedAssessment(options: {
  createdBy: string | null;
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  gaps?: Array<{
    questionId: string;
    question: string;
    level: string;
    section?: string;
    penalty?: string;
  }>;
  createdAt?: string;
}): string {
  const id = crypto.randomUUID();
  const result = {
    score: options.score,
    riskLevel: options.riskLevel,
    breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
    gaps: options.gaps ?? [],
    scoredQuestionCount: 12,
  };
  const createdByValue = options.createdBy ? `'${options.createdBy}'` : "NULL";
  d1Execute(
    `INSERT INTO assessments (id, organization_id, created_by, framework, framework_version, answers_json, result_json, created_at) VALUES ('${id}', NULL, ${createdByValue}, 'dpdp', '1.0.0', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', '${options.createdAt ?? new Date().toISOString()}')`,
  );
  return id;
}

function seedLeadForAssessment(assessmentId: string, name: string, email: string): string {
  const id = crypto.randomUUID();
  const result = {
    score: 50,
    riskLevel: "medium",
    breakdown: { critical: 0, high: 0, medium: 1, low: 11, total: 1 },
    gaps: [],
    scoredQuestionCount: 12,
  };
  d1Execute(
    `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at, status, priority, assigned_to, tags_json) VALUES ('${id}', NULL, '${assessmentId}', '${name}', '${email}', 'E2E Linked Co', '{}', '${JSON.stringify(result).replace(/'/g, "''")}', 'dpdp-scan', '${new Date().toISOString()}', 'new', 'medium', NULL, '[]')`,
  );
  return id;
}

test.describe("Enterprise Assessment Center (EAP-3)", () => {
  test("redirects an unauthenticated visit to /admin/assessments to the real Auth.js sign-in page", async ({
    page,
  }) => {
    await page.goto("/admin/assessments", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/api\/auth\/signin/, { timeout: 10_000 });
    expect(decodeURIComponent(page.url())).toContain(
      "callbackUrl=http://localhost:5173/admin/assessments",
    );
  });

  test("shows an honest 'Platform Administrator role required' message, not fabricated data, for an authenticated non-admin", async ({
    page,
    context,
  }) => {
    const { cookie } = seedSession({ email: `e2e-assessment-member-${Date.now()}@titan.local` });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    await page.goto("/admin/assessments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Assessments" })).toBeVisible({
      timeout: 10_000,
    });
    // Both the table's own section and the independently-fetching
    // Compliance Intelligence panel report the same honest forbidden
    // state — two real, correct occurrences.
    await expect(
      page.getByText("Platform Administrator role required to view this.").first(),
    ).toBeVisible();
  });

  test("real search, filter, and detail navigation for a Platform Administrator", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { cookie } = seedSession({
      email: `e2e-assessment-admin-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    // createdBy is stamped per run (searchable, unlike risk level alone) so
    // this suite's own seeded row is always identifiable against whatever
    // else persists in the shared local D1 across runs.
    const includedCreatedBy = `e2e-included-${stamp}`;
    const excludedCreatedBy = `e2e-excluded-${stamp}`;
    d1Execute(
      `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${includedCreatedBy}', 'Included', '${includedCreatedBy}@titan.local', NULL)`,
    );
    d1Execute(
      `INSERT INTO users (id, name, email, "emailVerified") VALUES ('${excludedCreatedBy}', 'Excluded', '${excludedCreatedBy}@titan.local', NULL)`,
    );
    seedAssessment({ createdBy: includedCreatedBy, score: 88, riskLevel: "critical" });
    seedAssessment({ createdBy: excludedCreatedBy, score: 10, riskLevel: "low" });

    await page.goto("/admin/assessments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Assessments" })).toBeVisible({
      timeout: 10_000,
    });

    // Real server-side search — narrows to exactly the one seeded
    // assessment whose createdBy matches. Waited for via the table's own
    // row count, not just "the row I want exists".
    await page.getByRole("searchbox", { name: "Search assessments" }).fill(includedCreatedBy);
    const table = page.getByRole("table", { name: "Assessments" });
    await expect(table.getByRole("row")).toHaveCount(2, { timeout: 10_000 }); // header + 1 data row
    const row = table.getByRole("row", { name: /Critical/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("88 / 100")).toBeVisible();
    await expect(page.getByText(excludedCreatedBy)).toHaveCount(0);

    // Real navigation into Assessment Details via the reference link.
    await row.getByRole("link").click();
    await expect(page.getByText("88 / 100")).toBeVisible({ timeout: 10_000 });
    // "dpdp v1.0.0" legitimately renders twice on this page (the Metadata
    // panel's plain text and the Results panel's FrameworkBadge) — scoped
    // to the panel that owns the fact this test actually cares about.
    await expect(page.getByLabel("Metadata").getByText("dpdp v1.0.0")).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
  });

  test("Assessment Details shows real Findings/Category coverage/Question responses, audit history, and lead linkage", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const { userId, cookie } = seedSession({
      email: `e2e-assessment-admin2-${stamp}@titan.local`,
      platformAdministrator: true,
    });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name: name!, value: value!, url: "http://localhost:8787" }]);

    const assessmentId = seedAssessment({
      createdBy: userId,
      score: 42,
      riskLevel: "high",
      gaps: [
        {
          questionId: "has_dpo",
          question: "Do you have a Data Protection Officer (DPO) appointed?",
          level: "critical",
          section: "Section 10",
          penalty: "₹150 crore (SDF violation)",
        },
      ],
    });
    const linkedLeadName = `E2E Linked Lead ${stamp}`;
    seedLeadForAssessment(assessmentId, linkedLeadName, `linked-${stamp}@example.com`);

    await page.goto(`/admin/assessments/${assessmentId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("42 / 100")).toBeVisible({ timeout: 10_000 });

    // Real findings, from this assessment's own server-computed result.gaps.
    // The same question text legitimately also appears in Question
    // responses (every question, not just failures) — scoped to Findings.
    await expect(
      page
        .getByLabel("Findings")
        .getByText("Do you have a Data Protection Officer (DPO) appointed?"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Category coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Question responses" })).toBeVisible();

    // Real audit history: this same page load's own assessment.viewed
    // event(s). React 19 StrictMode (main.tsx) double-invokes effects in
    // dev mode only — this dev server genuinely sends two real GET
    // /api/assessments/:id requests per page load, and the server
    // correctly records a real event for each, so exactly-one isn't a
    // valid assertion here specifically; production builds (StrictMode's
    // double-invocation is dev-only) would see exactly one.
    await expect(page.getByText("Assessment viewed").first()).toBeVisible();

    // Real lead linkage: the lead actually seeded against this assessment.
    const leadLink = page.getByRole("link", { name: linkedLeadName });
    await expect(leadLink).toBeVisible();
    await leadLink.click();
    await expect(page.getByRole("heading", { name: linkedLeadName })).toBeVisible({
      timeout: 10_000,
    });
  });
});

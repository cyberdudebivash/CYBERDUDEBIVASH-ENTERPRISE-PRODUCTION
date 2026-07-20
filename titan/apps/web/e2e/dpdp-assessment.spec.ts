import { expect, test } from "@playwright/test";

/**
 * The real, committed version of Stage 4's manual verification: a real
 * Chromium browser drives the actual DPDP assessment flow through a real
 * `wrangler dev` Worker backed by real local D1 — no mocks, no jsdom.
 * dpdp-v1.ts's question bank has 15 questions (1 text + 14 boolean); the
 * component tests already cover this same walk in jsdom (DpdpAssessmentPage.
 * test.tsx) — this suite's job is proving the real network path works, not
 * re-testing the UI logic those tests already cover.
 */
test("walks the full assessment flow and submits a lead through the real Worker API", async ({
  page,
}) => {
  const failedRequests: string[] = [];
  page.on("requestfailed", (request) => {
    // Google Fonts is blocked by this environment's network policy and a
    // missing favicon.ico both 404/reset regardless of app behavior — not
    // failures of the flow under test (see PLATFORM_FOUNDATION.md's Stage 4
    // verification notes, which hit the exact same two).
    const url = request.url();
    if (!url.includes("fonts.googleapis.com") && !url.includes("favicon")) {
      failedRequests.push(url);
    }
  });

  await page.goto("/assessment/dpdp");
  await page.getByRole("button", { name: "Start Free Risk Scan" }).click();
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

  await expect(page.getByText("Get your full report via email")).toBeVisible({ timeout: 10_000 });

  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  await page.getByLabel("Full name").fill("E2E Test");
  await page.getByLabel("Work email").fill(uniqueEmail);
  await page.getByLabel("Company name").fill("Playwright E2E Co");

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/leads") && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Send My Report" }).click(),
  ]);

  // The real assertion this suite exists for: the real Worker, backed by
  // real local D1, actually accepted the submission.
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string; email: string };
  expect(body.id).toBeTruthy();
  expect(body.email).toBe(uniqueEmail);

  await expect(page.getByText("Report sent")).toBeVisible({ timeout: 10_000 });
  expect(failedRequests).toEqual([]);
});

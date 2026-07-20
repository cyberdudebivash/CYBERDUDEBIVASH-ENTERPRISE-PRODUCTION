import { defineConfig, devices } from "@playwright/test";

/**
 * RC1 Workstream 9 (enterprise testing). Stage 4 used a throwaway,
 * uncommitted Playwright script to verify the assessment flow manually
 * (DECISION_LOG.md) — this promotes that into a real, committed E2E suite.
 *
 * Deliberately NOT wired into titan-ci.yml yet: that's a separate decision
 * (CI needs to actually download Playwright's browsers, which this local
 * sandbox has pre-installed but a GitHub Actions runner does not — a real
 * cost/flakiness tradeoff worth deciding explicitly, not as a side effect of
 * adding this file). See DECISION_LOG.md.
 *
 * Starts the real backend (migrations + `wrangler dev`) and the real
 * frontend (`vite`) — not mocks — the same two processes Stage 4's manual
 * verification used.
 */
const PLATFORM_PORT = 8787;
const WEB_PORT = 5173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // This sandbox pre-installs Chromium at a fixed path rather than
        // through Playwright's own browser-version-matched download — see
        // the repo's environment notes on PLAYWRIGHT_BROWSERS_PATH.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
  webServer: [
    {
      command: `cd ../../packages/platform && npm run db:migrations:apply:local && npm run dev -- --port ${PLATFORM_PORT}`,
      url: `http://localhost:${PLATFORM_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_BASE_URL: `http://localhost:${PLATFORM_PORT}` },
      timeout: 30_000,
    },
  ],
});

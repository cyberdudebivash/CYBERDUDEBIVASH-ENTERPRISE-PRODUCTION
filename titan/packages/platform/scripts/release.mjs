#!/usr/bin/env node
// PRD-1: release automation — chains this phase's own validation scripts
// before the real `wrangler deploy`, so a bad config or a missing secret
// fails fast, locally or in CI, before ever reaching Cloudflare's API.
//
// Steps 1-2 run and are fully verifiable today, against this file's own
// wrangler.toml and (once a real account exists) `wrangler secret list`.
// Step 3 (the real deploy) and step 4 (the post-deploy smoke test) cannot
// succeed in this project — there has never been a Cloudflare account/API
// token in any environment this project has run in (DECISION_LOG.md) — so
// this script is expected to stop at step 3 today, honestly, not silently
// skip it or fabricate a success. Full reasoning: DEPLOYMENT_GUIDE.md.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env");
const targetEnv = envIndex !== -1 ? args[envIndex + 1] : undefined;
const skipSmokeTest = args.includes("--no-smoke-test");

if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
  console.error("Usage: node scripts/release.mjs --env <staging|production> [--no-smoke-test]");
  process.exit(2);
}

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));

function step(label, command, cmdArgs) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, cmdArgs, {
    stdio: "inherit",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  });
  if (result.status !== 0) {
    console.error(`\nRelease to ${targetEnv} stopped at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

step("1/4 Config check (no unfilled placeholders)", "node", [
  `${scriptsDir}check-wrangler-config.mjs`,
  "--env",
  targetEnv,
]);

step("2/4 Secrets check (required secret names present)", "node", [
  `${scriptsDir}validate-secrets.mjs`,
  "--env",
  targetEnv,
]);

step("3/4 Deploy", "npx", ["wrangler", "deploy", "--env", targetEnv]);

if (skipSmokeTest) {
  console.log("\n=== 4/4 Smoke test skipped (--no-smoke-test) ===");
} else {
  console.log(
    "\n=== 4/4 Smoke test ===\n" +
      "wrangler deploy's own output above prints this deployment's real URL — " +
      "run:\n  npm run smoke-test -- --base-url <that URL>\nmanually against it. " +
      "Not run automatically here: parsing a real deploy's URL out of wrangler's " +
      "own stdout has never been exercised against a real deployment in this " +
      "project (no Cloudflare account has ever existed to deploy to), so this " +
      "script does not pretend to have verified that parsing works.",
  );
}

console.log(`\nRelease steps for ${targetEnv} completed.`);

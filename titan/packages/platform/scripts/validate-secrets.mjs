#!/usr/bin/env node
// PRD-1: confirms the *names* this deployment needs are actually set,
// without ever reading or printing a real secret value.
//
// --local checks .dev.vars (this project's own local-dev secret store,
// gitignored) directly — fully real and fully testable in this environment.
//
// --env <staging|production> shells out to `wrangler secret list --env
// <env> --format json`, which only ever returns secret *names* (Cloudflare's own
// API never returns a secret's value once set — write-only by design, the
// same property this script itself preserves). This mode needs a real
// Cloudflare account/API token to succeed; in this project, which has never
// had either (DECISION_LOG.md), it is expected to fail with an
// authentication error, not a validation failure — documented in
// DEPLOYMENT_GUIDE.md rather than silently glossed over.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REQUIRED_SECRETS = ["AUTH_SECRET"];
const OPTIONAL_SECRET_PAIRS = [
  ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
  ["RESEND_API_KEY", "EMAIL_FROM"],
];

const args = process.argv.slice(2);
const isLocal = args.includes("--local");
const envIndex = args.indexOf("--env");
const targetEnv = envIndex !== -1 ? args[envIndex + 1] : undefined;

if (!isLocal && !targetEnv) {
  console.error("Usage: node scripts/validate-secrets.mjs --local");
  console.error("       node scripts/validate-secrets.mjs --env <staging|production>");
  process.exit(2);
}

function parseDevVars(raw) {
  const set = new Set();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value !== "") set.add(key);
  }
  return set;
}

function reportMissing(configuredNames, sourceDescription) {
  const missingRequired = REQUIRED_SECRETS.filter((name) => !configuredNames.has(name));
  console.log(`Checked against: ${sourceDescription}`);
  console.log(
    `Configured secret names found: ${[...configuredNames].sort().join(", ") || "(none)"}`,
  );

  if (missingRequired.length > 0) {
    console.error(`\nMissing required secret(s): ${missingRequired.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll required secrets are present.");
  }

  for (const [idName, secretName] of OPTIONAL_SECRET_PAIRS) {
    const hasId = configuredNames.has(idName);
    const hasSecret = configuredNames.has(secretName);
    if (hasId !== hasSecret) {
      console.error(
        `\nWarning: ${idName} and ${secretName} must both be set or both unset ` +
          `(auth/config.ts only registers this provider when the pair is complete) — ` +
          `currently ${hasId ? idName : secretName} is set without its pair.`,
      );
      process.exitCode = 1;
    } else if (hasId && hasSecret) {
      console.log(`Optional provider pair configured: ${idName} + ${secretName}`);
    }
  }
}

if (isLocal) {
  const devVarsPath = fileURLToPath(new URL("../.dev.vars", import.meta.url));
  if (!existsSync(devVarsPath)) {
    console.error(
      '.dev.vars does not exist — see DEVELOPER_GUIDE.md\'s "Getting started": ' +
        "cp .dev.vars.example .dev.vars, then generate a real AUTH_SECRET.",
    );
    process.exit(1);
  }
  const configured = parseDevVars(readFileSync(devVarsPath, "utf8"));
  reportMissing(configured, ".dev.vars (local)");
} else {
  if (!["staging", "production"].includes(targetEnv)) {
    console.error(`Unknown environment: ${targetEnv} (expected staging or production)`);
    process.exit(2);
  }
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "list", "--env", targetEnv, "--format", "json"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(
      `wrangler secret list --env ${targetEnv} failed — this requires a real Cloudflare ` +
        "account/API token, which this project has never had (DECISION_LOG.md). " +
        "This is the expected result until a real account is configured; see " +
        'DEPLOYMENT_GUIDE.md\'s "Secrets management" section.',
    );
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  let names;
  try {
    const parsed = JSON.parse(result.stdout);
    names = new Set(parsed.map((entry) => entry.name));
  } catch {
    console.error("Could not parse `wrangler secret list --format json` output.");
    process.exit(1);
  }
  reportMissing(names, `wrangler secret list --env ${targetEnv}`);
}

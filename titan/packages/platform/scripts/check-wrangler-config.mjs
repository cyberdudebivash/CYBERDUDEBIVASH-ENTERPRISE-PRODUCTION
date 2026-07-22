#!/usr/bin/env node
// PRD-1: fails a deploy attempt fast, before wrangler ever runs, if the
// target environment's wrangler.toml block still contains one of this
// project's own literal "REPLACE_WITH_REAL_*" placeholders (wrangler.toml's
// own comments name the exact three: database_id, ALLOWED_ORIGIN — see the
// [env.staging]/[env.production] blocks). Reads the raw TOML as text rather
// than pulling in a TOML parser dependency this workspace doesn't otherwise
// need — the placeholders are a fixed, grep-able literal prefix by design.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env");
const targetEnv = envIndex !== -1 ? args[envIndex + 1] : undefined;

if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
  console.error("Usage: node scripts/check-wrangler-config.mjs --env <staging|production>");
  process.exit(2);
}

const configPath = fileURLToPath(new URL("../wrangler.toml", import.meta.url));
const raw = readFileSync(configPath, "utf8");

// Isolate this environment's own [env.X] ... block, including its
// sub-tables ([env.X.vars], [[env.X.d1_databases]], etc.) — from its bare
// top-level header to the *other* named environment's own bare top-level
// header (or end of file). Deliberately does not stop at any [env.X.*] sub-
// table, only at another bare [env.<name>] header — this file has exactly
// two named environments, checked directly here rather than via a generic
// (and easy to get subtly wrong, as an earlier version of this script did)
// "any [env. line ends the section" regex.
const otherEnv = targetEnv === "staging" ? "production" : "staging";
const sectionHeader = `[env.${targetEnv}]`;
const startIndex = raw.indexOf(sectionHeader);
if (startIndex === -1) {
  console.error(`No [env.${targetEnv}] block found in wrangler.toml`);
  process.exit(2);
}
const otherHeaderIndex = raw.indexOf(`[env.${otherEnv}]`, startIndex + sectionHeader.length);
const endIndex = otherHeaderIndex === -1 ? raw.length : otherHeaderIndex;
const section = raw.slice(startIndex, endIndex);

const placeholderPattern = /REPLACE_WITH_REAL_[A-Z0-9_]+/g;
const found = [...new Set(section.match(placeholderPattern) ?? [])];

if (found.length > 0) {
  console.error(`wrangler.toml's [env.${targetEnv}] block still has unfilled placeholders:`);
  for (const placeholder of found) {
    console.error(`  - ${placeholder}`);
  }
  console.error(
    "\nA real deploy needs real values here first — see DEPLOYMENT_GUIDE.md's " +
      '"First real deploy checklist". This is expected to fail today: neither ' +
      "environment has ever been deployed (DECISION_LOG.md).",
  );
  process.exit(1);
}

console.log(`wrangler.toml's [env.${targetEnv}] block has no unfilled placeholders.`);

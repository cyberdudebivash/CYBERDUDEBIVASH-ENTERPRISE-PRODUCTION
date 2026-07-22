#!/usr/bin/env node
// PRD-1: wraps `wrangler d1 export` with a timestamped output path under
// backups/ (gitignored — titan/.gitignore) — the exact same command and
// output format that would back up a real staging/production database once
// one exists (`--remote` instead of `--local`, a real database name instead
// of the local placeholder), verified for real against local D1 as part of
// this phase's own disaster-recovery drill (DISASTER_RECOVERY.md).
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const backupsDir = fileURLToPath(new URL("../backups", import.meta.url));
mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = `backups/titan-platform-db-local-${timestamp}.sql`;

console.log(`Exporting local D1 database to ${outputPath} ...`);
const result = spawnSync(
  "npx",
  ["wrangler", "d1", "export", "titan-platform-db", "--local", "--output", outputPath, "-y"],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("Backup failed — see wrangler's own output above.");
  process.exit(result.status ?? 1);
}
console.log(`Backup written: ${outputPath}`);

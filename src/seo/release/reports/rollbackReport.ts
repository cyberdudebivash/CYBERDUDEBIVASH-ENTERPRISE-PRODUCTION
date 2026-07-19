import { mkdir, writeFile } from "node:fs/promises";
import { reportsDir } from "../publisher/layout";
import type { RollbackManifest } from "../rollback/types";

// rollbackReport — computes (trivially — RollbackManifest already
// carries everything) and writes ROLLBACK_REPORT.md.

export function renderRollbackReportMarkdown(manifest: RollbackManifest): string {
  const errorCount = manifest.verificationIssues.filter((i) => i.severity === "error").length;
  const warningCount = manifest.verificationIssues.filter((i) => i.severity === "warning").length;
  const lines = [
    "# Rollback Report",
    "",
    "## Rollback Information",
    "",
    `- **From release:** ${manifest.fromReleaseId ? `\`${manifest.fromReleaseId}\`` : "none (nothing was previously published)"}`,
    `- **To release:** \`${manifest.toReleaseId}\``,
    `- **Rolled back at:** ${manifest.rolledBackAt}`,
    `- **Dry run:** ${manifest.dryRun ? "yes (current.json was not modified)" : "no"}`,
    "",
    "## Verification Status",
    "",
    `- Errors: ${errorCount}`,
    `- Warnings: ${warningCount}`,
  ];
  if (manifest.verificationIssues.length > 0) {
    lines.push("", "| Severity | Code | Message |", "|---|---|---|");
    for (const item of manifest.verificationIssues) lines.push(`| ${item.severity} | ${item.code} | ${item.message} |`);
  }
  return `${lines.join("\n")}\n`;
}

export async function writeRollbackReport(releaseRoot: string, manifest: RollbackManifest): Promise<string> {
  const dir = reportsDir(releaseRoot);
  await mkdir(dir, { recursive: true });
  const path = `${dir}/ROLLBACK_REPORT.md`;
  await writeFile(path, renderRollbackReportMarkdown(manifest), "utf-8");
  return path;
}

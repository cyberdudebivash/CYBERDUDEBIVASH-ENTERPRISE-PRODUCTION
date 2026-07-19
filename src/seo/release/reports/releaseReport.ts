import { mkdir, writeFile } from "node:fs/promises";
import type { ValidationIssue } from "../../validators/shared";
import { reportsDir } from "../publisher/layout";
import type { ReleaseMode, ReleasePlan } from "../planner/types";

// releaseReport — computes and writes RELEASE_REPORT.md. No separate
// writers/ directory exists this phase (unlike Build Platform's), so
// computing the report's data and rendering/writing it live together
// here, one file per report type — see documentation/RELEASE_FLOW.md.

export interface ReleaseReportData {
  releaseId: string;
  previousReleaseId: string | undefined;
  mode: ReleaseMode;
  createdAt: string;
  publishedAt: string | undefined;
  sourceDir: string;
  filesAdded: number;
  filesUpdated: number;
  filesRemoved: number;
  filesUnchanged: number;
  totalFiles: number;
  verificationIssues: ValidationIssue[];
}

export function buildReleaseReportData(plan: ReleasePlan, mode: ReleaseMode, publishedAt: string | undefined, verificationIssues: ValidationIssue[]): ReleaseReportData {
  return {
    releaseId: plan.releaseId,
    previousReleaseId: plan.previousReleaseId,
    mode,
    createdAt: plan.createdAt,
    publishedAt,
    sourceDir: plan.sourceDir,
    filesAdded: plan.filesAdded.length,
    filesUpdated: plan.filesUpdated.length,
    filesRemoved: plan.filesRemoved.length,
    filesUnchanged: plan.filesUnchanged.length,
    totalFiles: plan.files.length,
    verificationIssues,
  };
}

export function renderReleaseReportMarkdown(data: ReleaseReportData): string {
  const errorCount = data.verificationIssues.filter((i) => i.severity === "error").length;
  const warningCount = data.verificationIssues.filter((i) => i.severity === "warning").length;
  const lines = [
    "# Release Report",
    "",
    `- **Release ID:** \`${data.releaseId}\``,
    `- **Previous release:** ${data.previousReleaseId ? `\`${data.previousReleaseId}\`` : "none (first release)"}`,
    `- **Mode:** ${data.mode}`,
    `- **Created at:** ${data.createdAt}`,
    `- **Published at:** ${data.publishedAt ?? "not published (preview/dry-run)"}`,
    `- **Source:** \`${data.sourceDir}\``,
    "",
    "## Artifacts",
    "",
    `- Added: ${data.filesAdded}`,
    `- Updated: ${data.filesUpdated}`,
    `- Removed: ${data.filesRemoved}`,
    `- Unchanged (skipped): ${data.filesUnchanged}`,
    `- Total: ${data.totalFiles}`,
    "",
    "## Verification Status",
    "",
    `- Errors: ${errorCount}`,
    `- Warnings: ${warningCount}`,
  ];
  if (data.verificationIssues.length > 0) {
    lines.push("", "| Severity | Code | Message |", "|---|---|---|");
    for (const item of data.verificationIssues) lines.push(`| ${item.severity} | ${item.code} | ${item.message} |`);
  }
  return `${lines.join("\n")}\n`;
}

export async function writeReleaseReport(releaseRoot: string, data: ReleaseReportData): Promise<string> {
  const dir = reportsDir(releaseRoot);
  await mkdir(dir, { recursive: true });
  const path = `${dir}/RELEASE_REPORT.md`;
  await writeFile(path, renderReleaseReportMarkdown(data), "utf-8");
  return path;
}

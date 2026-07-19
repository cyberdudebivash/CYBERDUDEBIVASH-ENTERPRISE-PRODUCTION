import { writeTextFile } from "./fsWriter";
import type { BuildReportData } from "../reports/buildReport";

// ReportWriter — serialization only: renders BuildReportData (already
// fully computed by reports/buildReport.ts) into BUILD_REPORT.md
// markdown text.

function renderPagesTable(data: BuildReportData): string {
  const header = "| Page | Status | Errors | Warnings | Skipped |\n|---|---|---|---|---|";
  const rows = data.pages.map((page) => `| \`${page.pageId}\` | ${page.status} | ${page.errorCount} | ${page.warningCount} | ${page.skipped ? "yes" : "no"} |`);
  return [header, ...rows].join("\n");
}

export function renderBuildReportMarkdown(data: BuildReportData): string {
  const lines = [
    "# Build Report",
    "",
    `- **Mode:** ${data.mode}`,
    `- **Generated at:** ${data.generatedAt}`,
    `- **Duration:** ${data.durationMs.toFixed(2)}ms`,
    "",
    "## Coverage",
    "",
    `- Total pages: ${data.coverage.totalPages}`,
    `- Generated this run: ${data.coverage.generatedPages}`,
    `- Skipped (unchanged): ${data.coverage.skippedPages}`,
    `- Sitemap entries: ${data.coverage.sitemapEntries}`,
    "",
    "## Validation Summary",
    "",
    `- Errors: ${data.validationSummary.errorCount}`,
    `- Warnings: ${data.validationSummary.warningCount}`,
    "",
    "## Pages",
    "",
    renderPagesTable(data),
  ];

  if (data.runtimeHealth) {
    lines.push(
      "",
      "## Runtime Summary",
      "",
      `- Status: ${data.runtimeHealth.status}`,
      `- Configuration: ${data.runtimeHealth.configuration}`,
      `- Pipeline: ${data.runtimeHealth.pipeline}`,
      `- Relationships: ${data.runtimeHealth.relationships}`,
      `- Validation: ${data.runtimeHealth.validation}`,
      `- Commercial: ${data.runtimeHealth.commercial}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export async function writeBuildReport(outDir: string, data: BuildReportData): Promise<string> {
  return writeTextFile(outDir, "reports/BUILD_REPORT.md", renderBuildReportMarkdown(data));
}

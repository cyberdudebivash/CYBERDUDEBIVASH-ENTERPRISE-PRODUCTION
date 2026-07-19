import type { RuntimeHealthReport } from "../../runtime";
import type { BuildManifest } from "../manifests/types";

// buildReport — computes the BUILD_REPORT.md's structured content
// from a completed BuildManifest (this run's own data) and an optional
// RuntimeHealthReport (the Runtime Platform's own platform-wide
// snapshot — Runtime API surface, not a direct call into any
// individual engine). Pure aggregation; writers/reportWriter.ts
// renders this into markdown and writes it, per "writers perform
// serialization only."

export interface BuildReportPageRow {
  pageId: string;
  status: "valid" | "invalid";
  errorCount: number;
  warningCount: number;
  skipped: boolean;
}

export interface BuildReportData {
  mode: BuildManifest["mode"];
  generatedAt: string;
  durationMs: number;
  pages: BuildReportPageRow[];
  coverage: {
    totalPages: number;
    generatedPages: number;
    skippedPages: number;
    sitemapEntries: number;
  };
  validationSummary: { errorCount: number; warningCount: number };
  runtimeHealth: RuntimeHealthReport | undefined;
}

export function buildReportData(manifest: BuildManifest, sitemapEntries: number, runtimeHealth?: RuntimeHealthReport): BuildReportData {
  return {
    mode: manifest.mode,
    generatedAt: manifest.generatedAt,
    durationMs: manifest.summary.durationMs,
    pages: manifest.pages.map((page) => ({
      pageId: page.pageId,
      status: page.validationStatus,
      errorCount: page.errorCount,
      warningCount: page.warningCount,
      skipped: page.skipped,
    })),
    coverage: {
      totalPages: manifest.summary.totalPages,
      generatedPages: manifest.summary.totalPages - manifest.summary.skippedPages,
      skippedPages: manifest.summary.skippedPages,
      sitemapEntries,
    },
    validationSummary: {
      errorCount: manifest.summary.totalErrors,
      warningCount: manifest.summary.totalWarnings,
    },
    runtimeHealth,
  };
}

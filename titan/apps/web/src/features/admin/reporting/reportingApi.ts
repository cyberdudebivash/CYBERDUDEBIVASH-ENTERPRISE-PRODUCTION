import type { ExecutiveSummary, ReportTrendEntity, TrendSeries } from "@titan/platform";
import { getBlob, getJson, type Download } from "../../../lib/apiClient.js";

/** EAP-8: `@titan/web`'s side of the Enterprise Reporting & Analytics API
 * surface — same one-file-per-feature scope as `auditApi.ts`/`operationsApi.ts`. */

export function fetchReportingSummary(): Promise<ExecutiveSummary> {
  return getJson<ExecutiveSummary>("/api/reports/summary");
}

export function fetchReportTrends(entity: ReportTrendEntity, days: number): Promise<TrendSeries> {
  const params = new URLSearchParams({ entity, days: String(days) });
  return getJson<TrendSeries>(`/api/reports/trends?${params.toString()}`);
}

export type ReportExportFormat = "csv" | "json";

/** The Executive Summary as a real file download — `GET /api/reports/export`,
 * same shape and reasoning as `auditApi.ts`'s `exportAuditEvents`. */
export function exportReportingSummary(format: ReportExportFormat): Promise<Download> {
  return getBlob(`/api/reports/export?format=${format}`);
}

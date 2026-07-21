import type { AuditSearchOptions, AuditSearchResult } from "@titan/platform";
import { getBlob, getJson, type Download } from "../../../lib/apiClient.js";

/** EAP-6: `@titan/web`'s side of the Enterprise Audit Center's API surface —
 * same one-file-per-feature scope as `organizationApi.ts`/`userApi.ts`. */

export function searchAuditEvents(options: AuditSearchOptions): Promise<AuditSearchResult> {
  const params = buildAuditSearchParams(options);
  const query = params.toString();
  return getJson<AuditSearchResult>(`/api/audit/search${query ? `?${query}` : ""}`);
}

export type AuditExportFormat = "csv" | "json";

/** Same filters as `searchAuditEvents`, unpaginated (server-capped) and
 * returned as a real file download — `GET /api/audit/export`. */
export function exportAuditEvents(
  options: AuditSearchOptions,
  format: AuditExportFormat,
): Promise<Download> {
  const params = buildAuditSearchParams(options);
  params.set("format", format);
  return getBlob(`/api/audit/export?${params.toString()}`);
}

function buildAuditSearchParams(options: AuditSearchOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.actorId) params.set("actorId", options.actorId);
  if (options.organizationId) params.set("organizationId", options.organizationId);
  if (options.action) params.set("action", options.action);
  if (options.entityType) params.set("entityType", options.entityType);
  if (options.entityId) params.set("entityId", options.entityId);
  if (options.dateFrom) params.set("dateFrom", options.dateFrom);
  if (options.dateTo) params.set("dateTo", options.dateTo);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  return params;
}

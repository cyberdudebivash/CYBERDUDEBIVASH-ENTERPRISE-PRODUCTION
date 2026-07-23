import type {
  SupportRequestRecord,
  SupportRequestSearchOptions,
  SupportRequestSearchResult,
  SupportRequestStatus,
} from "@titan/platform";
import { getJson, patchJson } from "../../../lib/apiClient.js";

/** Admin Support Queue's own API surface (2026-07-23 production-readiness
 * audit, DECISION_LOG.md's Workstream 15) — the cross-organization
 * counterpart to `portal/portalApi.ts`'s customer-scoped
 * list/create-support-request calls. Mirrors `leads/leadApi.ts`'s own
 * shape. */

export function searchSupportRequests(
  options: SupportRequestSearchOptions,
): Promise<SupportRequestSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.organizationId) params.set("organizationId", options.organizationId);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<SupportRequestSearchResult>(
    `/api/support-requests/search${query ? `?${query}` : ""}`,
  );
}

export function updateSupportRequestStatus(
  id: string,
  status: SupportRequestStatus,
): Promise<SupportRequestRecord> {
  return patchJson<SupportRequestRecord>(`/api/support-requests/${encodeURIComponent(id)}`, {
    status,
  });
}

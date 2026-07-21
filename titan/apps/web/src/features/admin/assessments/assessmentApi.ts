import type {
  AssessmentRecord,
  AssessmentSearchOptions,
  AssessmentSearchResult,
  AuditEventRecord,
} from "@titan/platform";
import { getJson } from "../../../lib/apiClient.js";

/** EAP-3: `@titan/web`'s side of the Enterprise Assessment Center's API
 * surface — same one-file-per-feature scope as `leadApi.ts` (EAP-2).
 * Read-only: unlike leads, an assessment has no lifecycle to PATCH (see
 * DECISION_LOG.md's EAP-3 entry) — it's one immutable row per completed run. */

export function fetchAssessment(id: string): Promise<AssessmentRecord> {
  return getJson<AssessmentRecord>(`/api/assessments/${encodeURIComponent(id)}`);
}

export function searchAssessments(
  options: AssessmentSearchOptions,
): Promise<AssessmentSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.framework) params.set("framework", options.framework);
  if (options.riskLevel) params.set("riskLevel", options.riskLevel);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<AssessmentSearchResult>(`/api/assessments/search${query ? `?${query}` : ""}`);
}

/** A single assessment's own activity/audit trail — server-filtered
 * (`GET /api/audit?entityType=assessment&entityId=...`), same reasoning as
 * `leadApi.ts`'s `fetchLeadAuditTrail` (EAP-2). */
export function fetchAssessmentAuditTrail(assessmentId: string): Promise<AuditEventRecord[]> {
  const params = new URLSearchParams({ entityType: "assessment", entityId: assessmentId });
  return getJson<AuditEventRecord[]>(`/api/audit?${params}`);
}

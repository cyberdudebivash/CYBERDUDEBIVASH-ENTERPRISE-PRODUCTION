import type {
  AuditEventRecord,
  LeadLifecyclePatch,
  LeadRecord,
  LeadSearchOptions,
  LeadSearchResult,
} from "@titan/platform";
import { getJson, patchJson } from "../../../lib/apiClient.js";

/** EAP-2: `@titan/web`'s side of the Lead Intelligence Platform's API
 * surface. Kept in one file (mirroring `dpdp-assessment/leadStore.ts`'s own
 * scope) rather than spread across each component that happens to need a
 * fetch — every admin/leads/* screen depends on this, not on apiClient.ts
 * directly. */

export function fetchLead(id: string): Promise<LeadRecord> {
  return getJson<LeadRecord>(`/api/leads/${encodeURIComponent(id)}`);
}

/** `note` rides alongside the lifecycle patch on the wire (router.ts's
 * validateLeadLifecyclePatch) but isn't itself a LeadLifecyclePatch field —
 * it never mutates the lead row, only appends a lead.note_added audit
 * event (DECISION_LOG.md's EAP-2 entry). */
export function updateLead(
  id: string,
  patch: LeadLifecyclePatch & { note?: string },
): Promise<LeadRecord> {
  return patchJson<LeadRecord>(`/api/leads/${encodeURIComponent(id)}`, patch);
}

export function searchLeads(options: LeadSearchOptions): Promise<LeadSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.priority) params.set("priority", options.priority);
  if (options.assignedTo) params.set("assignedTo", options.assignedTo);
  // EAP-4 fix: these two options existed on LeadSearchOptions (EAP-3's
  // assessmentId, EAP-4's organizationId) but were never actually forwarded
  // here — every caller (Assessment Details' "Lead linkage" panel,
  // Organization Relationships' "associated leads" panel) was silently
  // getting an unfiltered `GET /api/leads/search?pageSize=...` instead of
  // the scoped query it asked for. Found while wiring the equivalent
  // organizationId call for EAP-4; DECISION_LOG.md records this as a real,
  // pre-existing EAP-3 defect, not new EAP-4 scope.
  if (options.assessmentId) params.set("assessmentId", options.assessmentId);
  if (options.organizationId) params.set("organizationId", options.organizationId);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<LeadSearchResult>(`/api/leads/search${query ? `?${query}` : ""}`);
}

/** A single lead's own activity/audit trail — server-filtered
 * (`GET /api/audit?entityType=lead&entityId=...`), not the whole audit log
 * fetched and filtered client-side (DECISION_LOG.md's EAP-2 entry). */
export function fetchLeadAuditTrail(leadId: string): Promise<AuditEventRecord[]> {
  const params = new URLSearchParams({ entityType: "lead", entityId: leadId });
  return getJson<AuditEventRecord[]>(`/api/audit?${params}`);
}

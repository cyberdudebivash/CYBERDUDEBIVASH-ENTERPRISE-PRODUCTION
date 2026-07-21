import type {
  AuditEventRecord,
  NewOrganization,
  OrganizationPatch,
  OrganizationRecord,
  OrganizationSearchOptions,
  OrganizationSearchResult,
} from "@titan/platform";
import { getJson, patchJson, postJson } from "../../../lib/apiClient.js";

/** EAP-4: `@titan/web`'s side of the Enterprise Organization Management
 * Platform's API surface — same one-file-per-feature scope as
 * `assessmentApi.ts`/`leadApi.ts`. Unlike assessments (read-only past
 * creation), an organization has a real administrative write surface
 * (create/update/archive/restore), same shape as leads' lifecycle. */

export function fetchOrganization(id: string): Promise<OrganizationRecord> {
  return getJson<OrganizationRecord>(`/api/organizations/${encodeURIComponent(id)}`);
}

export function searchOrganizations(
  options: OrganizationSearchOptions,
): Promise<OrganizationSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.industry) params.set("industry", options.industry);
  if (options.region) params.set("region", options.region);
  if (options.tag) params.set("tag", options.tag);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<OrganizationSearchResult>(`/api/organizations/search${query ? `?${query}` : ""}`);
}

export function createOrganization(body: NewOrganization): Promise<OrganizationRecord> {
  return postJson<OrganizationRecord>("/api/organizations", body);
}

/** `note` isn't a field on `OrganizationPatch` — same "always just an audit
 * event" reasoning as `leadApi.ts`'s `updateLead`. */
export function updateOrganization(
  id: string,
  patch: OrganizationPatch & { note?: string },
): Promise<OrganizationRecord> {
  return patchJson<OrganizationRecord>(`/api/organizations/${encodeURIComponent(id)}`, patch);
}

/** A single organization's own activity/audit trail — server-filtered
 * (`GET /api/audit?entityType=organization&entityId=...`), same reasoning as
 * `assessmentApi.ts`'s `fetchAssessmentAuditTrail`. */
export function fetchOrganizationAuditTrail(organizationId: string): Promise<AuditEventRecord[]> {
  const params = new URLSearchParams({ entityType: "organization", entityId: organizationId });
  return getJson<AuditEventRecord[]>(`/api/audit?${params}`);
}

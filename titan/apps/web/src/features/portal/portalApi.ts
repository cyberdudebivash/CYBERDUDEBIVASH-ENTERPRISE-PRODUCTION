import type {
  AssessmentSearchResult,
  AuditEventRecord,
  OrganizationRecord,
  PortalComplianceSummary,
  SupportRequestRecord,
} from "@titan/platform";
import { getBlob, getJson, postJson, type Download } from "../../lib/apiClient.js";

/** CPP-1: `@titan/web`'s side of the Customer Portal's API surface — same
 * one-file-per-feature scope as `reportingApi.ts`/`auditApi.ts`. Every
 * function here calls a `/api/portal/*` route, which derives "my own
 * organization" server-side from the caller's own session — nothing here
 * ever sends an organization id, since the client has no say in which
 * organization's data it gets back. */

export function fetchPortalOrganization(): Promise<OrganizationRecord> {
  return getJson<OrganizationRecord>("/api/portal/organization");
}

/** Self-service onboarding — the real fix for the production incident this
 * codebase's own DECISION_LOG.md (2026-07-23) traced to a signed-in
 * customer having no organization and no path to one without a Platform
 * Administrator acting on their account. `PortalLayout` calls this when
 * `useSession()` reflects a real session with zero organization
 * memberships, instead of the dead-end "contact your administrator"
 * message it used to show unconditionally. */
export function createPortalOrganization(input: {
  name: string;
  industry?: string | null;
  region?: string | null;
}): Promise<{ organization: OrganizationRecord; profile: unknown }> {
  return postJson("/api/portal/organization", input);
}

export function fetchPortalAssessments(
  options: { page?: number; pageSize?: number } = {},
): Promise<AssessmentSearchResult> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<AssessmentSearchResult>(`/api/portal/assessments${query ? `?${query}` : ""}`);
}

export function fetchPortalComplianceSummary(): Promise<PortalComplianceSummary> {
  return getJson<PortalComplianceSummary>("/api/portal/reports/summary");
}

export type PortalReportExportFormat = "csv" | "json";

export function exportPortalComplianceSummary(format: PortalReportExportFormat): Promise<Download> {
  return getBlob(`/api/portal/reports/export?format=${format}`);
}

/** "Recent Activity"/"Notifications" — a real, organization-scoped slice
 * of this organization's own audit trail (router.ts's `getPortalActivity`),
 * not a fabricated notifications inbox. */
export function fetchPortalActivity(): Promise<AuditEventRecord[]> {
  return getJson<AuditEventRecord[]>("/api/portal/activity");
}

export function fetchPortalSupportRequests(): Promise<SupportRequestRecord[]> {
  return getJson<SupportRequestRecord[]>("/api/portal/support");
}

export function createPortalSupportRequest(input: {
  subject: string;
  message: string;
}): Promise<SupportRequestRecord> {
  return postJson<SupportRequestRecord>("/api/portal/support", input);
}

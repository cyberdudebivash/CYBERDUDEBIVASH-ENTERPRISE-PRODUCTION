import { Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";
import { auditActionLabel } from "../audit/auditActionLabels.js";

export interface UserAuditPanelProps {
  events: AuditEventRecord[];
}

/**
 * A user's own audit trail (`GET /api/audit?entityType=user&entityId=...`,
 * EAP-5) rendered through the same `Timeline` component
 * `OrganizationAuditPanel`/`AssessmentAuditPanel`/`LeadAuditPanel` already
 * established — same reuse, not a fourth timeline implementation. The
 * action vocabulary here is exactly what `router.ts` actually records
 * (viewed/role_granted/role_changed/role_revoked) — nothing invented
 * beyond that.
 */
export function UserAuditPanel({ events }: UserAuditPanelProps) {
  const entries: TimelineEntry[] = [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => ({
      id: event.id,
      label: auditActionLabel(event.action),
      timestamp: new Date(event.createdAt).toLocaleString(),
    }));

  return <Timeline entries={entries} emptyLabel="No activity recorded yet." />;
}

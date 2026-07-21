import { Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";

export interface OrganizationAuditPanelProps {
  events: AuditEventRecord[];
}

const ACTION_LABELS: Record<string, string> = {
  "organization.created": "Organization created",
  "organization.viewed": "Organization viewed",
  "organization.updated": "Organization details updated",
  "organization.archived": "Organization archived",
  "organization.restored": "Organization restored",
  "organization.note_added": "Note added",
};

/**
 * An organization's own audit trail (`GET /api/audit?entityType=organization&
 * entityId=...`, EAP-4) rendered through the same `Timeline` component
 * `AssessmentAuditPanel`/`LeadAuditPanel` already established — same reuse,
 * not a third timeline implementation. The action vocabulary here is
 * exactly what `router.ts` actually records (created/viewed/updated/
 * archived/restored/note_added) — nothing invented beyond that.
 */
export function OrganizationAuditPanel({ events }: OrganizationAuditPanelProps) {
  const entries: TimelineEntry[] = [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => ({
      id: event.id,
      label: ACTION_LABELS[event.action] ?? event.action,
      timestamp: new Date(event.createdAt).toLocaleString(),
    }));

  return <Timeline entries={entries} emptyLabel="No activity recorded yet." />;
}

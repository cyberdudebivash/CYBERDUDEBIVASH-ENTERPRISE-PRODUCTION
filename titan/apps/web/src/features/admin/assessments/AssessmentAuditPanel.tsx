import { Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";

export interface AssessmentAuditPanelProps {
  events: AuditEventRecord[];
}

const ACTION_LABELS: Record<string, string> = {
  "assessment.created": "Assessment created",
  "assessment.viewed": "Assessment viewed",
};

/**
 * An assessment's own audit trail (`GET /api/audit?entityType=assessment&
 * entityId=...`, EAP-3) rendered through the same `Timeline` component
 * `LeadAuditPanel` (EAP-2) already established — same reuse, not a second
 * timeline implementation. Assessments have no lifecycle to mutate (see
 * DECISION_LOG.md's EAP-3 entry), so this is a shorter, real action
 * vocabulary than leads' — created and viewed, nothing invented beyond
 * what `router.ts` actually records.
 */
export function AssessmentAuditPanel({ events }: AssessmentAuditPanelProps) {
  const entries: TimelineEntry[] = [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => ({
      id: event.id,
      label: ACTION_LABELS[event.action] ?? event.action,
      timestamp: new Date(event.createdAt).toLocaleString(),
    }));

  return <Timeline entries={entries} emptyLabel="No activity recorded yet." />;
}

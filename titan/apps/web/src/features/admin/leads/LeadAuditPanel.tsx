import { Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";

export interface LeadAuditPanelProps {
  events: AuditEventRecord[];
}

const ACTION_LABELS: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.viewed": "Lead viewed",
  "lead.status_changed": "Status changed",
  "lead.priority_changed": "Priority changed",
  "lead.assigned": "Assignment changed",
  "lead.tags_changed": "Tags changed",
  "lead.note_added": "Note added",
};

function describeEvent(event: AuditEventRecord): string | undefined {
  const metadata = event.metadata as Record<string, unknown> | null;
  if (!metadata) return undefined;
  if (event.action === "lead.note_added" && typeof metadata.note === "string") {
    return metadata.note;
  }
  if ("from" in metadata || "to" in metadata) {
    const from = metadata.from === null ? "unassigned" : String(metadata.from ?? "—");
    const to = metadata.to === null ? "unassigned" : String(metadata.to ?? "—");
    return `${from} → ${to}`;
  }
  return undefined;
}

/**
 * Both "Activity timeline" (lifecycle changes + notes) and "Audit history"
 * (access events) at once — real `audit_events` rows for this one lead
 * (`GET /api/audit?entityType=lead&entityId=...`, EAP-2), rendered through
 * the same `Timeline` component the design system already provides. See
 * DECISION_LOG.md's EAP-2 entry for why this codebase models both concerns
 * as the same underlying event log rather than two separate features.
 */
export function LeadAuditPanel({ events }: LeadAuditPanelProps) {
  const entries: TimelineEntry[] = [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => ({
      id: event.id,
      label: ACTION_LABELS[event.action] ?? event.action,
      detail: describeEvent(event),
      timestamp: new Date(event.createdAt).toLocaleString(),
    }));

  return <Timeline entries={entries} emptyLabel="No activity recorded yet." />;
}

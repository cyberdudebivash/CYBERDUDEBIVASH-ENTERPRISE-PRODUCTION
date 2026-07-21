import { useMemo, useState } from "react";
import { Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";
import { auditActionLabel, auditEntityTypeLabel } from "./auditActionLabels.js";
import { AuditEntityBadge } from "./AuditEntityBadge.js";
import "./AuditInvestigationView.css";

export interface AuditInvestigationViewProps {
  events: AuditEventRecord[];
}

type GroupBy = "entity" | "actor" | "organization";

interface Group {
  key: string;
  label: string;
  events: AuditEventRecord[];
}

/**
 * EAP-6: Investigation View (Workstream 5) — event grouping and correlation
 * by entity/actor/organization over the currently filtered/searched result
 * set (`AuditWorkspacePage`'s own `useAuditSearch` state; the same filters,
 * not a second, independent query). Deliberately operates on one page of
 * results at a time, same scope as the table view it sits alongside — not a
 * speculative correlation engine that fetches and holds every matching
 * event across every page. "Investigation notes" (the brief's optional
 * workstream item) has no backing column on `audit_events` and isn't built
 * here — documented as a known limitation, not fabricated.
 */
export function AuditInvestigationView({ events }: AuditInvestigationViewProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("entity");

  const groups = useMemo(() => groupEvents(events, groupBy), [events, groupBy]);

  return (
    <div className="titan-audit-investigation">
      <div className="titan-audit-investigation__controls">
        <span className="titan-audit-investigation__controls-label">Group by</span>
        {(["entity", "actor", "organization"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`titan-audit-investigation__group-button${
              groupBy === option ? " titan-audit-investigation__group-button--active" : ""
            }`}
            aria-pressed={groupBy === option}
            onClick={() => setGroupBy(option)}
          >
            {option === "entity" ? "Entity" : option === "actor" ? "Actor" : "Organization"}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="titan-audit-investigation__empty">No events to correlate on this page.</p>
      ) : (
        <div className="titan-audit-investigation__groups">
          {groups.map((group) => (
            <div key={group.key} className="titan-audit-investigation__group">
              <div className="titan-audit-investigation__group-header">
                <h3 className="titan-audit-investigation__group-title">{group.label}</h3>
                <span className="titan-audit-investigation__group-count">
                  {group.events.length} event{group.events.length === 1 ? "" : "s"}
                </span>
              </div>
              <Timeline entries={toTimelineEntries(group.events)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupEvents(events: AuditEventRecord[], groupBy: GroupBy): Group[] {
  const groups = new Map<string, Group>();

  for (const event of events) {
    const { key, label } = groupKey(event, groupBy);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(key, { key, label, events: [event] });
    }
  }

  return [...groups.values()].sort((a, b) => b.events.length - a.events.length);
}

function groupKey(event: AuditEventRecord, groupBy: GroupBy): { key: string; label: string } {
  switch (groupBy) {
    case "actor":
      return event.actorId
        ? { key: `actor:${event.actorId}`, label: `Actor ${event.actorId}` }
        : { key: "actor:anonymous", label: "System / anonymous" };
    case "organization":
      return event.organizationId
        ? { key: `org:${event.organizationId}`, label: `Organization ${event.organizationId}` }
        : { key: "org:none", label: "Platform-level (no organization)" };
    case "entity":
    default:
      return event.entityId
        ? {
            key: `${event.entityType}:${event.entityId}`,
            label: `${auditEntityTypeLabel(event.entityType)} ${event.entityId}`,
          }
        : { key: `${event.entityType}:none`, label: auditEntityTypeLabel(event.entityType) };
  }
}

function toTimelineEntries(events: AuditEventRecord[]): TimelineEntry[] {
  return [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => ({
      id: event.id,
      label: (
        <>
          {auditActionLabel(event.action)}{" "}
          <AuditEntityBadge entityType={event.entityType} entityId={event.entityId} />
        </>
      ),
      timestamp: new Date(event.createdAt).toLocaleString(),
    }));
}

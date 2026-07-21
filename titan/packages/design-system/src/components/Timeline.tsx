import type { ReactNode } from "react";
import "./Timeline.css";

export interface TimelineEntry {
  id: string;
  /** e.g. "Status changed" — the fact of what happened. */
  label: ReactNode;
  /** e.g. "new → qualified", a note's body — the specifics. */
  detail?: ReactNode;
  /** Pre-formatted for display — this component doesn't own date formatting
   * (locale/timezone choices belong to the feature rendering real audit
   * data, not a generic display primitive). */
  timestamp: string;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  emptyLabel?: string;
}

/** A chronological activity feed — EAP-2's Lead Details reuses this same
 * component for both "Activity timeline" (lifecycle changes + notes) and
 * "Audit history" (access events): both are really "a list of things that
 * happened to this record, in order," which is exactly what audit_events
 * already models (DECISION_LOG.md's EAP-2 entry) and all this component
 * needs to render. An `<ol>`, not a `<ul>` — order is meaningful here. */
export function Timeline({ entries, emptyLabel = "No activity yet." }: TimelineProps) {
  if (entries.length === 0) {
    return <p className="titan-timeline__empty">{emptyLabel}</p>;
  }

  return (
    <ol className="titan-timeline">
      {entries.map((entry) => (
        <li key={entry.id} className="titan-timeline__entry">
          <div className="titan-timeline__marker" aria-hidden="true" />
          <div className="titan-timeline__content">
            <div className="titan-timeline__row">
              <span className="titan-timeline__label">{entry.label}</span>
              <time className="titan-timeline__timestamp">{entry.timestamp}</time>
            </div>
            {entry.detail && <div className="titan-timeline__detail">{entry.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

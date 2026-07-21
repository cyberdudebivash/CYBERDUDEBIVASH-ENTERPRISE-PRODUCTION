import type { ReactNode } from "react";
import "./EmptyState.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** The real "nothing matched" state for a filtered list/table — distinct
 * from a loading state (LoadingSkeleton) and an error state (both of which
 * a real list has to distinguish honestly, EAP-2's own engineering
 * principles: never let an empty *filtered* result read as "no data
 * exists at all"). */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="titan-empty-state" role="status">
      <p className="titan-empty-state__title">{title}</p>
      {description && <p className="titan-empty-state__description">{description}</p>}
      {action && <div className="titan-empty-state__action">{action}</div>}
    </div>
  );
}

import { useId, type ReactNode } from "react";
import "./Panel.css";

export interface PanelProps {
  title: string;
  children: ReactNode;
  /** e.g. a "View all" link — rendered next to the title, not implied by it. */
  action?: ReactNode;
}

/**
 * A labeled section container for grouping related content (dashboard
 * metric groups, future list/detail screens) — `<section>` with a real
 * heading, not a generic `<div>`, so the page's landmark/heading structure
 * stays meaningful as more of these are added.
 */
export function Panel({ title, children, action }: PanelProps) {
  const titleId = useId();

  return (
    <section className="titan-panel" aria-labelledby={titleId}>
      <div className="titan-panel__header">
        <h2 className="titan-panel__title" id={titleId}>
          {title}
        </h2>
        {action}
      </div>
      <div className="titan-panel__body">{children}</div>
    </section>
  );
}

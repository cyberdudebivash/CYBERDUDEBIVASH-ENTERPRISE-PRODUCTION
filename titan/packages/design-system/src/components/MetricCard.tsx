import type { ReactNode } from "react";
import "./MetricCard.css";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Rendered instead of `value` while the real number is still loading —
   * keeps the card's layout stable instead of the whole tile appearing/
   * disappearing. `aria-live="polite"` on the value means a screen reader
   * announces the real number once it replaces the loading state, without
   * interrupting whatever the user is doing to do it (EAP-1 Dashboard). */
  isLoading?: boolean;
}

export function MetricCard({ label, value, hint, isLoading }: MetricCardProps) {
  return (
    <div className="titan-metric-card">
      <p className="titan-metric-card__label">{label}</p>
      <p className="titan-metric-card__value" aria-live="polite" aria-busy={isLoading || undefined}>
        {isLoading ? <span className="titan-metric-card__skeleton" aria-hidden="true" /> : value}
      </p>
      {hint && <p className="titan-metric-card__hint">{hint}</p>}
    </div>
  );
}

import "./LoadingSkeleton.css";

export interface LoadingSkeletonProps {
  /** Number of placeholder rows/lines to render. */
  lines?: number;
  label?: string;
}

/** A generic "real data is still loading" placeholder for content shapes
 * MetricCard's own built-in skeleton doesn't cover (a table, a list, a
 * detail panel) — one `role="status"` announcing the loading state once,
 * not once per placeholder line (a screen reader doesn't need "loading"
 * read five times for a five-row table). */
export function LoadingSkeleton({ lines = 3, label = "Loading…" }: LoadingSkeletonProps) {
  return (
    <div className="titan-loading-skeleton" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="titan-loading-skeleton__line" aria-hidden="true" />
      ))}
    </div>
  );
}

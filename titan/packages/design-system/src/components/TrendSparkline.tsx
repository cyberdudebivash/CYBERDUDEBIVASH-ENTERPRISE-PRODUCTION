import "./TrendSparkline.css";

export interface TrendSparklinePoint {
  date: string;
  count: number;
}

export interface TrendSparklineProps {
  points: TrendSparklinePoint[];
  /** e.g. "Lead trend" — used to build a real, data-derived `aria-label`
   * ("Lead trend: 12 total over 30 days, 3 on the most recent day"), not a
   * generic "chart" announcement. The exact per-day numbers this
   * necessarily summarizes rather than lists belong in an adjacent, real
   * `<table>` (e.g. `DataTable`) — this is a decorative shape, not the
   * accessible data itself. */
  label: string;
}

const WIDTH = 240;
const HEIGHT = 48;

/**
 * A minimal, dependency-free inline SVG line — EAP-8's one new visual
 * primitive (Workstream 8), reused across every trend entity (leads,
 * assessments, organizations, audit, identity) in the Analytics panel
 * rather than duplicated per entity. Deliberately not a charting library:
 * five data points plotted as a polyline needs no dependency, matching
 * this codebase's standing preference (`DataTable`'s own doc comment) for
 * the simplest real implementation over a new build dependency for a shape
 * this simple.
 */
export function TrendSparkline({ points, label }: TrendSparklineProps) {
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((point) => point.count));
  const stepX = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  const coords = points
    .map((point, index) => {
      const x = stepX * index;
      const y = HEIGHT - (point.count / max) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const total = points.reduce((sum, point) => sum + point.count, 0);
  // Non-null: the `points.length === 0` check above guarantees this index
  // exists.
  const last = points[points.length - 1]!;

  return (
    <svg
      className="titan-trend-sparkline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${label}: ${total} total over ${points.length} days, ${last.count} on the most recent day`}
    >
      <polyline
        className="titan-trend-sparkline__line"
        points={coords}
        fill="none"
        strokeWidth="2"
      />
    </svg>
  );
}

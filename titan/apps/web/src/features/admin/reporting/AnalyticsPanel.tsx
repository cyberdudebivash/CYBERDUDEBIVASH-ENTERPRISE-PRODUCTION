import { useEffect, useState } from "react";
import {
  Alert,
  DataTable,
  LoadingSkeleton,
  TrendSparkline,
  type DataTableColumn,
} from "@titan/design-system";
import type { ReportTrendEntity, TrendPoint, TrendSeries } from "@titan/platform";
import { REPORT_TREND_ENTITIES } from "@titan/platform";
import type { MeResponse } from "../auth/session.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import {
  getReportingViewPreference,
  setReportingViewPreference,
} from "./reportingWorkspacePreferences.js";
import { useTrendSeries } from "./useTrendSeries.js";
import "./AnalyticsPanel.css";

const ENTITY_LABELS: Record<ReportTrendEntity, string> = {
  leads: "Leads",
  assessments: "Assessments",
  organizations: "Organizations",
  audit: "Audit volume",
  identity: "Identity activity",
};

const DAY_OPTIONS = [7, 30, 90] as const;

export interface AnalyticsPanelProps {
  me: MeResponse;
}

/**
 * EAP-8 Workstream 4 (Analytics) — one entity/date-range selector, backed by
 * `GET /api/reports/trends`, reusing `TrendSparkline` (a decorative shape)
 * alongside a real, accessible `DataTable` of the exact same per-day counts
 * (Workstream 9: the sparkline alone would leave a screen-reader user
 * without the real numbers). The selection itself is a "Saved Report"
 * (Workstream 6) in the same `localStorage`, per-browser sense every other
 * Workspace's own view preferences already are.
 */
export function AnalyticsPanel({ me }: AnalyticsPanelProps) {
  const [entity, setEntity] = useState<ReportTrendEntity>(
    () => getReportingViewPreference().entity,
  );
  const [days, setDays] = useState<number>(() => getReportingViewPreference().days);

  useEffect(() => {
    setReportingViewPreference({ entity, days });
  }, [entity, days]);

  const series = useTrendSeries(me, entity, days);

  return (
    <div className="titan-analytics-panel">
      <div className="titan-analytics-panel__controls">
        <label className="titan-analytics-panel__control">
          Entity
          <select
            value={entity}
            onChange={(event) => setEntity(event.target.value as ReportTrendEntity)}
          >
            {REPORT_TREND_ENTITIES.map((option) => (
              <option key={option} value={option}>
                {ENTITY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="titan-analytics-panel__control">
          Window
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
        </label>
      </div>
      <TrendSection state={series} label={ENTITY_LABELS[entity]} />
    </div>
  );
}

function TrendSection({ state, label }: { state: SectionState<TrendSeries>; label: string }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={3} label="Loading trend…" />;
    case "forbidden":
      return (
        <p className="titan-analytics-panel__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load this data">
          {state.message}
        </Alert>
      );
    case "ready":
      return <TrendResult series={state.data} label={label} />;
  }
}

function TrendResult({ series, label }: { series: TrendSeries; label: string }) {
  const columns: DataTableColumn<TrendPoint>[] = [
    { id: "date", header: "Date", render: (point) => point.date },
    { id: "count", header: "Count", align: "right", render: (point) => point.count },
  ];

  return (
    <>
      <TrendSparkline points={series.points} label={`${label} trend`} />
      <DataTable
        columns={columns}
        rows={series.points}
        getRowKey={(point) => point.date}
        caption={`${label} trend by day`}
      />
    </>
  );
}

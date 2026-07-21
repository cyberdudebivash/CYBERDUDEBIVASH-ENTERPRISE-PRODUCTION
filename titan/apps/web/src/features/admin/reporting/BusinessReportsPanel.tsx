import { DataTable, type DataTableColumn } from "@titan/design-system";
import type { ExecutiveSummary } from "@titan/platform";
import "./BusinessReportsPanel.css";

export interface BusinessReportsPanelProps {
  summary: ExecutiveSummary;
}

interface BreakdownRow {
  key: string;
  count: number;
}

function toRows(counts: Record<string, number>): BreakdownRow[] {
  return Object.entries(counts).map(([key, count]) => ({ key, count }));
}

function BreakdownTable({ caption, counts }: { caption: string; counts: Record<string, number> }) {
  const columns: DataTableColumn<BreakdownRow>[] = [
    { id: "key", header: "Category", render: (row) => row.key },
    { id: "count", header: "Count", align: "right", render: (row) => row.count },
  ];
  return (
    <DataTable
      columns={columns}
      rows={toRows(counts)}
      getRowKey={(row) => row.key}
      caption={caption}
    />
  );
}

/**
 * EAP-8 Workstream 3 (Business Reports) — every breakdown here is a real,
 * server-computed count from `GET /api/reports/summary`, reusing the same
 * `DataTable` `ServiceStatusPanel`/`RuntimeMetricsPanel` already established
 * as this system's one reusable tabular primitive, rather than a bespoke
 * table per report.
 */
export function BusinessReportsPanel({ summary }: BusinessReportsPanelProps) {
  return (
    <div className="titan-business-reports__grid">
      <BreakdownTable caption="Leads by status" counts={summary.leads.byStatus} />
      <BreakdownTable caption="Leads by priority" counts={summary.leads.byPriority} />
      <BreakdownTable caption="Leads by risk level" counts={summary.leads.byRiskLevel} />
      <BreakdownTable
        caption="Assessments by risk level"
        counts={summary.assessments.byRiskLevel}
      />
      <BreakdownTable caption="Assessments by framework" counts={summary.assessments.byFramework} />
      {summary.organizations.configured && (
        <BreakdownTable caption="Organizations by status" counts={summary.organizations.byStatus} />
      )}
      <BreakdownTable
        caption="Top audit actions"
        counts={Object.fromEntries(
          summary.audit.topActions.map((entry) => [entry.action, entry.count]),
        )}
      />
    </div>
  );
}

import { useState } from "react";
import {
  Alert,
  Button,
  DataTable,
  LoadingSkeleton,
  Panel,
  type DataTableColumn,
} from "@titan/design-system";
import { AssessmentSummaryCard } from "../AssessmentSummaryCard.js";
import { exportPortalComplianceSummary, type PortalReportExportFormat } from "../portalApi.js";
import { usePortalReports } from "./usePortalReports.js";
import "./PortalReportsPage.css";

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reports — this organization's own real Compliance Report (Assessment
 * Reports and Compliance Reports are the same real view in this data
 * model: the only "compliance" concept this system has is a DPDP
 * assessment's own risk breakdown — `DECISION_LOG.md`'s CPP-1 entry) plus
 * a real CSV/JSON download of the identical data, reusing `GET
 * /api/portal/reports/export`.
 *
 * "Export History" is deliberately not built: no export or download is
 * ever persisted anywhere in this codebase (`GET /api/reports/export`/
 * `GET /api/audit/export` are both stateless reads, EAP-6/EAP-8) —
 * fabricating a history list would invent data this system doesn't
 * actually capture, the same "no request status" honesty
 * `AuditEventDetailPanel.tsx` already established for a different gap.
 */
export function PortalReportsPage() {
  const state = usePortalReports();
  const [exportState, setExportState] = useState<
    { status: "idle" } | { status: "exporting" } | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleExport(format: PortalReportExportFormat) {
    setExportState({ status: "exporting" });
    try {
      const { blob, filename } = await exportPortalComplianceSummary(format);
      downloadBlob(blob, filename);
      setExportState({ status: "idle" });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not export your report.",
      });
    }
  }

  return (
    <div className="titan-portal-reports">
      <div className="titan-portal-reports__header">
        <h1 className="titan-portal-reports__title">Reports</h1>
        <div className="titan-portal-reports__export">
          <Button
            variant="secondary"
            onClick={() => handleExport("csv")}
            isLoading={exportState.status === "exporting"}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport("json")}
            isLoading={exportState.status === "exporting"}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {exportState.status === "error" && (
        <Alert variant="error" title="Could not export your report">
          {exportState.message}
        </Alert>
      )}

      <Panel title="Compliance report">
        {state.status === "loading" && <LoadingSkeleton lines={4} label="Loading your report…" />}
        {state.status === "forbidden" && (
          <p className="titan-portal-reports__note">Reports are currently unavailable.</p>
        )}
        {state.status === "error" && (
          <Alert variant="error" title="Could not load your report">
            {state.message}
          </Alert>
        )}
        {state.status === "ready" && (
          <div className="titan-portal-reports__grid">
            <AssessmentSummaryCard report={state.data.assessments} />
            <BreakdownTable
              caption="Assessments by risk level"
              counts={state.data.assessments.byRiskLevel}
            />
            <BreakdownTable
              caption="Assessments by framework"
              counts={state.data.assessments.byFramework}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

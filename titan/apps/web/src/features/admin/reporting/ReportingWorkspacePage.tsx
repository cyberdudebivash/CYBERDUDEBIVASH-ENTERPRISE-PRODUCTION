import { useState, type ReactNode } from "react";
import { Alert, Button, LoadingSkeleton, Panel } from "@titan/design-system";
import type { ExecutiveSummary } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { AnalyticsPanel } from "./AnalyticsPanel.js";
import { BusinessReportsPanel } from "./BusinessReportsPanel.js";
import { ExecutiveSummaryPanel } from "./ExecutiveSummaryPanel.js";
import { exportReportingSummary, type ReportExportFormat } from "./reportingApi.js";
import { useReportingData } from "./useReportingData.js";
import "./ReportingWorkspacePage.css";

export function ReportingWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <ReportingWorkspaceContent me={session.me} /> : null;
}

/** Exported for direct testing, matching every other Workspace's own
 * `*Content` pattern (Organization/User/Assessment/Lead/Audit/Operations). */
export function ReportingWorkspaceContent({ me }: { me: MeResponse }) {
  const data = useReportingData(me);
  const [exportState, setExportState] = useState<
    { status: "idle" } | { status: "exporting" } | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleExport(format: ReportExportFormat) {
    setExportState({ status: "exporting" });
    try {
      const { blob, filename } = await exportReportingSummary(format);
      downloadBlob(blob, filename);
      setExportState({ status: "idle" });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not export the report.",
      });
    }
  }

  return (
    <div className="titan-reporting-workspace">
      <div className="titan-reporting-workspace__header">
        <h1 className="titan-reporting-workspace__title">Reporting &amp; Analytics</h1>
        <div className="titan-reporting-workspace__export">
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
        <Alert variant="error" title="Could not export the report">
          {exportState.message}
        </Alert>
      )}

      <Panel title="Executive Dashboard">
        <SummarySection
          state={data.summary}
          render={(summary) => <ExecutiveSummaryPanel summary={summary} />}
        />
      </Panel>

      <Panel title="Business Reports">
        <SummarySection
          state={data.summary}
          render={(summary) => <BusinessReportsPanel summary={summary} />}
        />
      </Panel>

      <Panel title="Analytics">
        <AnalyticsPanel me={me} />
      </Panel>
    </div>
  );
}

function SummarySection({
  state,
  render,
}: {
  state: SectionState<ExecutiveSummary>;
  render: (summary: ExecutiveSummary) => ReactNode;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={4} label="Loading reporting summary…" />;
    case "forbidden":
      return (
        <p className="titan-reporting-workspace__note">
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
      return render(state.data);
  }
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

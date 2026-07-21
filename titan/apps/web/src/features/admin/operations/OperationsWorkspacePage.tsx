import type { ReactNode } from "react";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import type { OperationsSummary } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import type { HealthPayload, SectionState } from "../dashboard/useDashboardData.js";
import { RuntimeMetricsPanel } from "./RuntimeMetricsPanel.js";
import { ServiceStatusPanel } from "./ServiceStatusPanel.js";
import { SystemOverviewPanel } from "./SystemOverviewPanel.js";
import { useOperationsData } from "./useOperationsData.js";
import "./OperationsWorkspacePage.css";

export function OperationsWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <OperationsWorkspaceContent me={session.me} /> : null;
}

/** Exported for direct testing, matching every other Workspace's own
 * `*Content` pattern (Organization/User/Assessment/Lead/Audit). */
export function OperationsWorkspaceContent({ me }: { me: MeResponse }) {
  const data = useOperationsData(me);

  return (
    <div className="titan-operations-workspace">
      <h1 className="titan-operations-workspace__title">Operations Center</h1>

      <div className="titan-operations-workspace__grid">
        <Panel title="Platform health">
          <HealthSection state={data.health} />
        </Panel>

        <Panel title="Readiness">
          <HealthSection state={data.readiness} />
        </Panel>
      </div>

      <Panel title="Service status">
        <SummarySection
          state={data.summary}
          render={(summary) => <ServiceStatusPanel services={summary.services} />}
        />
      </Panel>

      <Panel title="Runtime metrics">
        <SummarySection
          state={data.summary}
          render={(summary) => (
            <RuntimeMetricsPanel
              requestCounts={summary.requestCounts}
              repositoryOperations={summary.repositoryOperations}
            />
          )}
        />
      </Panel>

      <Panel title="Background operations">
        {/* EAP-7 Workstream 5: no queue/Durable Object/cron infrastructure
            exists anywhere in this codebase (wrangler.toml has no
            [[queues]]/durable_objects/[triggers] block) — an honest,
            explicit note rather than a fabricated queue view. */}
        <p className="titan-operations-workspace__note">
          No background job, queue, or scheduled-task infrastructure exists in this deployment.
          Every operation in this system runs synchronously within a single request.
        </p>
      </Panel>

      <Panel title="System overview">
        <SummarySection
          state={data.summary}
          render={(summary) => <SystemOverviewPanel overview={summary.overview} />}
        />
      </Panel>
    </div>
  );
}

function HealthSection({ state }: { state: SectionState<HealthPayload> }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={1} label="Checking…" />;
    case "forbidden":
      return (
        <p className="titan-operations-workspace__note">
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
      return (
        <p className="titan-operations-workspace__status">
          <span
            className={`titan-operations-workspace__status-dot titan-operations-workspace__status-dot--${
              state.data.status === "ok" || state.data.status === "ready" ? "ok" : "down"
            }`}
            aria-hidden="true"
          />
          {state.data.service}: {state.data.status}
        </p>
      );
  }
}

function SummarySection({
  state,
  render,
}: {
  state: SectionState<OperationsSummary>;
  render: (summary: OperationsSummary) => ReactNode;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={4} label="Loading operations summary…" />;
    case "forbidden":
      return (
        <p className="titan-operations-workspace__note">
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
      return <>{render(state.data)}</>;
  }
}

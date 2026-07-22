import type { ReactNode } from "react";
import { Alert, Badge, LoadingSkeleton, Panel } from "@titan/design-system";
import { highestSeverity, type OperationsSummary } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import type { HealthPayload, SectionState } from "../dashboard/useDashboardData.js";
import { AlertsPanel } from "./AlertsPanel.js";
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

      {data.summary.status === "ready" && <OperationalSummaryBanner summary={data.summary.data} />}

      <div className="titan-operations-workspace__grid">
        <Panel title="Platform health">
          <HealthSection state={data.health} />
        </Panel>

        <Panel title="Readiness">
          <HealthSection state={data.readiness} />
        </Panel>
      </div>

      <Panel title="Alerts">
        <SummarySection
          state={data.summary}
          render={(summary) => <AlertsPanel alerts={summary.alerts} />}
        />
      </Panel>

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
              requestSummary={summary.requestSummary}
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

const SUMMARY_BANNER_COPY: Record<
  "critical" | "warning" | "healthy",
  { label: string; tone: "error" | "warning" | "success" }
> = {
  critical: { label: "Critical — one or more thresholds breached", tone: "error" },
  warning: { label: "Degraded — one or more warning thresholds breached", tone: "warning" },
  healthy: { label: "Healthy — no alerts firing", tone: "success" },
};

/** OPS-1 (Workstream 10, "Operational Summary"): one line combining real,
 * already-computed data (`highestSeverity` over the same `alerts` the Alerts
 * panel below renders in full, plus the existing System Overview's own
 * version/environment) — not a new signal, a composition of existing ones,
 * so it can never say something the panels beneath it don't already say in
 * more detail. */
function OperationalSummaryBanner({ summary }: { summary: OperationsSummary }) {
  const severity = highestSeverity(summary.alerts) ?? "healthy";
  const copy = SUMMARY_BANNER_COPY[severity];
  return (
    <div className="titan-operations-summary-banner">
      <Badge tone={copy.tone}>{copy.label}</Badge>
      <span className="titan-operations-summary-banner__label">
        {summary.overview.environment} · v{summary.overview.version}
      </span>
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

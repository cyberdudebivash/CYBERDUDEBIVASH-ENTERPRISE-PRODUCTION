import { DataTable, EmptyState, type DataTableColumn } from "@titan/design-system";
import type { RecordedCount, RecordedDuration, RequestHealthSummary } from "@titan/platform";

export interface RuntimeMetricsPanelProps {
  requestCounts: RecordedCount[];
  repositoryOperations: RecordedDuration[];
  /** OPS-1 (Workstream 2): optional so this panel's own 3 pre-existing
   * tests, which construct it without this prop, keep passing unchanged —
   * every real caller (`OperationsWorkspacePage.tsx`) always has it, since
   * `operationsSummary` (router.ts) always computes it. */
  requestSummary?: RequestHealthSummary;
}

function average(durations: number[]): number {
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * EAP-7: Workstream 4 (Runtime Metrics) — reads `ctx.metrics`'s own real
 * counters back out (`observability/metrics.ts`, instrumented since
 * Workstream 8 of an earlier phase but never surfaced anywhere until this
 * one). Scoped to this Worker isolate's own lifetime, same limitation
 * `security/rateLimiter.ts` already documents for the identical reason —
 * stated in the empty-state copy, not hidden. Never invents a number: an
 * empty array here means zero requests have actually landed on this
 * isolate since it started, not a fabricated placeholder.
 */
export function RuntimeMetricsPanel({
  requestCounts,
  repositoryOperations,
  requestSummary,
}: RuntimeMetricsPanelProps) {
  const requestColumns: DataTableColumn<RecordedCount>[] = [
    { id: "method", header: "Method", render: (entry) => entry.tags.method ?? "—" },
    { id: "path", header: "Path", render: (entry) => entry.tags.path ?? "—" },
    { id: "status", header: "Status", render: (entry) => entry.tags.status ?? "—" },
    { id: "count", header: "Requests", render: (entry) => entry.count },
  ];

  const operationColumns: DataTableColumn<RecordedDuration>[] = [
    { id: "operation", header: "Operation", render: (entry) => entry.tags.operation ?? entry.name },
    { id: "samples", header: "Samples", render: (entry) => entry.durations.length },
    { id: "avg", header: "Avg", render: (entry) => `${average(entry.durations)} ms` },
    { id: "max", header: "Max", render: (entry) => `${Math.max(...entry.durations)} ms` },
  ];

  return (
    <div className="titan-operations-metrics">
      {requestSummary && (
        <div>
          <h3 className="titan-operations-metrics__subheading">Request health</h3>
          {requestSummary.latency.count === 0 ? (
            <EmptyState
              title="No requests recorded yet"
              description="Error rate and latency percentiles need at least one recorded request on this isolate."
            />
          ) : (
            <dl className="titan-operations-request-health">
              <div>
                <dt>5xx error rate</dt>
                <dd>{formatRate(requestSummary.errorRate.serverErrorRate)}</dd>
              </div>
              <div>
                <dt>4xx error rate</dt>
                <dd>{formatRate(requestSummary.errorRate.clientErrorRate)}</dd>
              </div>
              <div>
                <dt>p50 latency</dt>
                <dd>{requestSummary.latency.p50} ms</dd>
              </div>
              <div>
                <dt>p95 latency</dt>
                <dd>{requestSummary.latency.p95} ms</dd>
              </div>
              <div>
                <dt>p99 latency</dt>
                <dd>{requestSummary.latency.p99} ms</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      <div>
        <h3 className="titan-operations-metrics__subheading">Request counts</h3>
        {requestCounts.length === 0 ? (
          <EmptyState
            title="No requests recorded yet"
            description="Counters reset whenever this Worker isolate restarts — this reflects only what has run since then."
          />
        ) : (
          <DataTable
            columns={requestColumns}
            rows={requestCounts}
            getRowKey={(entry) =>
              `${entry.name}:${entry.tags.method}:${entry.tags.path}:${entry.tags.status}`
            }
            caption="Request counts"
          />
        )}
      </div>
      <div>
        <h3 className="titan-operations-metrics__subheading">Repository operations</h3>
        {repositoryOperations.length === 0 ? (
          <EmptyState
            title="No repository operations recorded yet"
            description="Counters reset whenever this Worker isolate restarts — this reflects only what has run since then."
          />
        ) : (
          <DataTable
            columns={operationColumns}
            rows={repositoryOperations}
            getRowKey={(entry) => `${entry.name}:${entry.tags.operation}`}
            caption="Repository operation durations"
          />
        )}
      </div>
    </div>
  );
}

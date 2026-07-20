import type { ReactNode } from "react";
import { Alert, MetricCard, Panel } from "@titan/design-system";
import type { AssessmentRecord, AuditEventRecord } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";
import type { LeadRecord } from "../../dpdp-assessment/leadStore.js";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import { useDashboardData, type SectionState } from "./useDashboardData.js";
import "./DashboardPage.css";

const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

function countByRiskLevel(records: Array<{ result: { riskLevel: RiskLevel } }>) {
  const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const record of records) counts[record.result.riskLevel] += 1;
  return counts;
}

function countByAction(events: AuditEventRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.action, (counts.get(event.action) ?? 0) + 1);
  return counts;
}

/** Renders a section's real content on success, and an honest, specific
 * explanation otherwise — never a silently-empty or fabricated-zero card.
 * "Forbidden" is not treated as an error: it's the expected, correct
 * outcome for a signed-in caller who isn't a Platform Administrator. */
function Section<T>({
  state,
  render,
}: {
  state: SectionState<T>;
  render: (data: T) => ReactNode;
}): ReactNode {
  switch (state.status) {
    case "loading":
      return <p className="titan-dashboard__section-note">Loading…</p>;
    case "forbidden":
      return (
        <p className="titan-dashboard__section-note">
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

/** Same state-to-render mapping as `Section`, shaped for a `MetricCard`
 * instead of a full-width block — "forbidden"/"error" render as a `—` with
 * an explanatory hint rather than a fabricated `0`, which would look
 * identical to "really is zero" and mislead anyone glancing at the row. */
function overviewMetricProps<T>(
  state: SectionState<T>,
  toValue: (data: T) => ReactNode,
): { value: ReactNode; hint?: string; isLoading?: boolean } {
  switch (state.status) {
    case "loading":
      return { value: 0, isLoading: true };
    case "forbidden":
      return { value: "—", hint: "Platform Administrator required" };
    case "error":
      return { value: "—", hint: "Could not load" };
    case "ready":
      return { value: toValue(state.data) };
  }
}

export function DashboardPage() {
  const session = useSession();
  return session.status === "authenticated" ? (
    <DashboardContent me={session.me} />
  ) : // RequireAuth (this page's only real parent) never renders children
  // except when "authenticated" — this exists so DashboardPage stays
  // correct, not silently wrong, if that ever stops being true (e.g. a
  // future test rendering it in isolation) rather than crashing on a
  // non-null assertion.
  null;
}

/** Exported (not just a local closure) so tests can drive it directly with
 * a fixed `me`, instead of going through `useSession()`/`SessionProvider`
 * for every Dashboard-content test — `DashboardPage` itself is the thin,
 * separately-tested wrapper that supplies `me` from the real session. */
export function DashboardContent({ me }: { me: MeResponse }) {
  const data = useDashboardData(me);

  return (
    <div className="titan-dashboard">
      <h1 className="titan-dashboard__title">Dashboard</h1>

      <Panel title="Executive overview">
        <div className="titan-dashboard__metrics">
          <MetricCard
            label="Organizations"
            {...overviewMetricProps(data.organizations, (orgs) => orgs.length)}
          />
          <MetricCard label="Leads" {...overviewMetricProps(data.leads, (leads) => leads.length)} />
          <MetricCard
            label="Assessments"
            {...overviewMetricProps(data.assessments, (assessments) => assessments.length)}
          />
        </div>
      </Panel>

      <div className="titan-dashboard__grid">
        <Panel title="Lead risk distribution">
          <Section
            state={data.leads}
            render={(leads: LeadRecord[]) => <RiskBreakdown records={leads} />}
          />
        </Panel>

        <Panel title="Assessment risk distribution">
          <Section
            state={data.assessments}
            render={(assessments: AssessmentRecord[]) => <RiskBreakdown records={assessments} />}
          />
        </Panel>

        <Panel title="Recent activity">
          <Section
            state={data.audit}
            render={(events: AuditEventRecord[]) => <RecentActivity events={events} />}
          />
        </Panel>

        <Panel title="Audit summary">
          <Section
            state={data.audit}
            render={(events: AuditEventRecord[]) => <AuditSummary events={events} />}
          />
        </Panel>

        <Panel title="Platform health">
          <Section
            state={data.health}
            render={(health) => <StatusLine label={health.service} value={health.status} />}
          />
        </Panel>

        <Panel title="System status">
          <Section
            state={data.readiness}
            render={(readiness) => (
              <StatusLine label={readiness.service} value={readiness.status} />
            )}
          />
        </Panel>
      </div>
    </div>
  );
}

function RiskBreakdown({ records }: { records: Array<{ result: { riskLevel: RiskLevel } }> }) {
  if (records.length === 0) {
    return <p className="titan-dashboard__section-note">No records yet.</p>;
  }
  const counts = countByRiskLevel(records);
  return (
    <ul className="titan-dashboard__risk-list">
      {RISK_LEVELS.map((level) => (
        <li
          key={level}
          className={`titan-dashboard__risk-item titan-dashboard__risk-item--${level}`}
        >
          <span className="titan-dashboard__risk-label">{level}</span>
          <span className="titan-dashboard__risk-count">{counts[level]}</span>
        </li>
      ))}
    </ul>
  );
}

function RecentActivity({ events }: { events: AuditEventRecord[] }) {
  const recent = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  if (recent.length === 0) {
    return <p className="titan-dashboard__section-note">No activity recorded yet.</p>;
  }

  return (
    <ul className="titan-dashboard__activity-list">
      {recent.map((event) => (
        <li key={event.id}>
          <span className="titan-dashboard__activity-action">{event.action}</span>
          <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}

function AuditSummary({ events }: { events: AuditEventRecord[] }) {
  if (events.length === 0) {
    return <p className="titan-dashboard__section-note">No audit events recorded yet.</p>;
  }
  const counts = countByAction(events);
  return (
    <ul className="titan-dashboard__activity-list">
      {[...counts.entries()].map(([action, count]) => (
        <li key={action}>
          <span className="titan-dashboard__activity-action">{action}</span>
          <span>{count}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  const isHealthy = value === "ok" || value === "ready";
  return (
    <p className="titan-dashboard__status">
      <span
        className={`titan-dashboard__status-dot ${isHealthy ? "titan-dashboard__status-dot--ok" : "titan-dashboard__status-dot--down"}`}
        aria-hidden="true"
      />
      {label}: {value}
    </p>
  );
}

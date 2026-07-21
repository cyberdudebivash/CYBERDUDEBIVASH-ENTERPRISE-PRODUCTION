import { Link } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel, Timeline, type TimelineEntry } from "@titan/design-system";
import type {
  AuditEventRecord,
  OrganizationRecord,
  PortalComplianceSummary,
} from "@titan/platform";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { auditActionLabel } from "../../admin/audit/auditActionLabels.js";
import { AssessmentSummaryCard } from "../AssessmentSummaryCard.js";
import { usePortalDashboard } from "./usePortalDashboard.js";
import "./PortalDashboardPage.css";

/**
 * The Customer Portal's Organization Dashboard — Organization Overview
 * (real org metadata; editing organization settings stays an admin-only
 * capability, `DECISION_LOG.md`'s CPP-1 entry — this is read-only, the
 * same reasoning `EAP-4`'s own "not a self-service portal" scope line
 * already drew), a Compliance Summary (reusing `AssessmentSummaryCard`),
 * and Recent Activity/Notifications (this organization's own real audit
 * trail, not a fabricated notifications inbox).
 */
export function PortalDashboardPage() {
  const { organization, complianceSummary, activity } = usePortalDashboard();

  return (
    <div className="titan-portal-dashboard">
      <h1 className="titan-portal-dashboard__title">Dashboard</h1>

      <Panel title="Organization overview">
        <OrganizationSection state={organization} />
      </Panel>

      <Panel title="Compliance summary">
        <ComplianceSection state={complianceSummary} />
      </Panel>

      <Panel title="Recent activity">
        <ActivitySection state={activity} />
      </Panel>
    </div>
  );
}

function OrganizationSection({ state }: { state: SectionState<OrganizationRecord> }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={3} label="Loading your organization…" />;
    case "forbidden":
      return (
        <p className="titan-portal-dashboard__note">
          Access to your organization data is currently unavailable.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load your organization">
          {state.message}
        </Alert>
      );
    case "ready":
      return (
        <dl className="titan-portal-dashboard__org-meta">
          <div>
            <dt>Name</dt>
            <dd>{state.data.name}</dd>
          </div>
          <div>
            <dt>Industry</dt>
            <dd>{state.data.industry ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{state.data.region ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{state.data.status}</dd>
          </div>
        </dl>
      );
  }
}

function ComplianceSection({ state }: { state: SectionState<PortalComplianceSummary> }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={2} label="Loading compliance summary…" />;
    case "forbidden":
      return (
        <p className="titan-portal-dashboard__note">Compliance data is currently unavailable.</p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load your compliance summary">
          {state.message}
        </Alert>
      );
    case "ready":
      return (
        <>
          <AssessmentSummaryCard report={state.data.assessments} />
          <p className="titan-portal-dashboard__link">
            <Link to="/portal/reports">View full reports →</Link>
          </p>
        </>
      );
  }
}

function toTimelineEntry(event: AuditEventRecord): TimelineEntry {
  return {
    id: event.id,
    label: auditActionLabel(event.action),
    detail:
      event.entityType === "assessment" && event.entityId ? (
        <Link to={`/portal/assessments/${event.entityId}`}>View assessment</Link>
      ) : undefined,
    timestamp: new Date(event.createdAt).toLocaleString(),
  };
}

function ActivitySection({ state }: { state: SectionState<AuditEventRecord[]> }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={4} label="Loading recent activity…" />;
    case "forbidden":
      return <p className="titan-portal-dashboard__note">Activity is currently unavailable.</p>;
    case "error":
      return (
        <Alert variant="error" title="Could not load recent activity">
          {state.message}
        </Alert>
      );
    case "ready":
      return (
        <Timeline
          entries={state.data.map(toTimelineEntry)}
          emptyLabel="No activity recorded for your organization yet."
        />
      );
  }
}

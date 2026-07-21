import { Link, useParams } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import type { LeadRecord } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import { LeadAuditPanel } from "./LeadAuditPanel.js";
import { LeadLifecyclePanel } from "./LeadLifecyclePanel.js";
import { LeadRiskPanel } from "./LeadRiskPanel.js";
import { useLeadDetail } from "./useLeadDetail.js";
import "./LeadDetailPage.css";

export function LeadDetailPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();
  if (session.status !== "authenticated" || !id) return null;
  return <LeadDetailContent id={id} me={session.me} />;
}

/** Exported for direct testing, matching DashboardContent/
 * LeadWorkspaceContent's pattern — a fixed `id`/`me` instead of driving
 * routing/session context per test. */
export function LeadDetailContent({ id, me }: { id: string; me: MeResponse }) {
  const detail = useLeadDetail(id);

  return (
    <div className="titan-lead-detail">
      <Link to="/admin/leads" className="titan-lead-detail__back">
        ← Back to Leads
      </Link>

      {detail.lead.status === "loading" && <LoadingSkeleton lines={6} label="Loading lead…" />}

      {detail.lead.status === "forbidden" && (
        <p className="titan-lead-detail__note">
          Platform Administrator role required to view this.
        </p>
      )}

      {detail.lead.status === "error" && (
        <Alert variant="error" title="Could not load this lead">
          {detail.lead.message}
        </Alert>
      )}

      {detail.lead.status === "ready" && (
        <LeadDetailBody lead={detail.lead.data} me={me} detail={detail} />
      )}
    </div>
  );
}

function LeadDetailBody({
  lead,
  me,
  detail,
}: {
  lead: LeadRecord;
  me: MeResponse;
  detail: ReturnType<typeof useLeadDetail>;
}) {
  return (
    <>
      <h1 className="titan-lead-detail__title">{lead.name}</h1>

      <div className="titan-lead-detail__grid">
        <Panel title="Identity">
          <dl className="titan-lead-detail__fields">
            <div>
              <dt>Email</dt>
              <dd>{lead.email}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{lead.company}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{detail.organizationName ?? "Not linked to an organization"}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Submission">
          <dl className="titan-lead-detail__fields">
            <div>
              <dt>Submitted</dt>
              <dd>{new Date(lead.timestamp).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{lead.source}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Risk intelligence">
          <LeadRiskPanel lead={lead} linkedAssessment={detail.linkedAssessment} />
        </Panel>

        <Panel title="Lifecycle">
          <LeadLifecyclePanel
            lead={lead}
            me={me}
            isSubmitting={detail.isSubmitting}
            submitError={detail.submitError}
            onUpdate={detail.updateLifecycle}
          />
        </Panel>

        <Panel title="Activity & audit history">
          {detail.auditTrail.status === "loading" && (
            <LoadingSkeleton lines={4} label="Loading activity…" />
          )}
          {detail.auditTrail.status === "forbidden" && (
            <p className="titan-lead-detail__note">
              Platform Administrator role required to view this.
            </p>
          )}
          {detail.auditTrail.status === "error" && (
            <Alert variant="error" title="Could not load activity">
              {detail.auditTrail.message}
            </Alert>
          )}
          {detail.auditTrail.status === "ready" && (
            <LeadAuditPanel events={detail.auditTrail.data} />
          )}
        </Panel>
      </div>
    </>
  );
}

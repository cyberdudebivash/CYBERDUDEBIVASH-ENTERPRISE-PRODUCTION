import { Link, useParams } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import type { AssessmentRecord } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import { AssessmentAuditPanel } from "./AssessmentAuditPanel.js";
import { AssessmentResultsPanel } from "./AssessmentResultsPanel.js";
import { useAssessmentDetail } from "./useAssessmentDetail.js";
import "./AssessmentDetailPage.css";

export function AssessmentDetailPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();
  if (session.status !== "authenticated" || !id) return null;
  return <AssessmentDetailContent id={id} me={session.me} />;
}

/** Exported for direct testing, matching LeadDetailContent's pattern
 * (EAP-2) — a fixed `id`/`me` instead of driving routing/session context
 * per test. */
export function AssessmentDetailContent({ id, me }: { id: string; me: MeResponse }) {
  const detail = useAssessmentDetail(id);

  return (
    <div className="titan-assessment-detail">
      <Link to="/admin/assessments" className="titan-assessment-detail__back">
        ← Back to Assessments
      </Link>

      {detail.assessment.status === "loading" && (
        <LoadingSkeleton lines={6} label="Loading assessment…" />
      )}

      {detail.assessment.status === "forbidden" && (
        <p className="titan-assessment-detail__note">
          Platform Administrator role required to view this.
        </p>
      )}

      {detail.assessment.status === "error" && (
        <Alert variant="error" title="Could not load this assessment">
          {detail.assessment.message}
        </Alert>
      )}

      {detail.assessment.status === "ready" && (
        <AssessmentDetailBody assessment={detail.assessment.data} me={me} detail={detail} />
      )}
    </div>
  );
}

function AssessmentDetailBody({
  assessment,
  me,
  detail,
}: {
  assessment: AssessmentRecord;
  me: MeResponse;
  detail: ReturnType<typeof useAssessmentDetail>;
}) {
  return (
    <>
      <h1 className="titan-assessment-detail__title">Assessment #{assessment.id.slice(0, 8)}</h1>

      <div className="titan-assessment-detail__grid">
        <Panel title="Metadata">
          <dl className="titan-assessment-detail__fields">
            <div>
              <dt>Framework</dt>
              <dd>
                {assessment.framework} v{assessment.frameworkVersion}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Completed</dd>
            </div>
            <div>
              <dt>Completion timestamp</dt>
              <dd>{new Date(assessment.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{detail.organizationName ?? "Not linked to an organization"}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {assessment.createdBy
                  ? assessment.createdBy === me.userId
                    ? "Me"
                    : assessment.createdBy
                  : "—"}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Risk & compliance results">
          <AssessmentResultsPanel assessment={assessment} />
        </Panel>

        <Panel title="Lead linkage">
          <LeadLinkageSection state={detail.linkedLeads} />
        </Panel>

        <Panel title="Activity & audit history">
          {detail.auditTrail.status === "loading" && (
            <LoadingSkeleton lines={4} label="Loading activity…" />
          )}
          {detail.auditTrail.status === "forbidden" && (
            <p className="titan-assessment-detail__note">
              Platform Administrator role required to view this.
            </p>
          )}
          {detail.auditTrail.status === "error" && (
            <Alert variant="error" title="Could not load activity">
              {detail.auditTrail.message}
            </Alert>
          )}
          {detail.auditTrail.status === "ready" && (
            <AssessmentAuditPanel events={detail.auditTrail.data} />
          )}
        </Panel>
      </div>
    </>
  );
}

function LeadLinkageSection({
  state,
}: {
  state: ReturnType<typeof useAssessmentDetail>["linkedLeads"];
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={2} label="Loading linked leads…" />;
    case "forbidden":
      return (
        <p className="titan-assessment-detail__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load linked leads">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.length === 0) {
        return (
          <p className="titan-assessment-detail__note">No leads are linked to this assessment.</p>
        );
      }
      return (
        <ul className="titan-assessment-detail__lead-links">
          {state.data.map((lead) => (
            <li key={lead.id}>
              <Link to={`/admin/leads/${lead.id}`}>{lead.name}</Link>
              <span className="titan-assessment-detail__lead-company">{lead.company}</span>
            </li>
          ))}
        </ul>
      );
  }
}

import { Link, useParams } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import { AssessmentResultsPanel } from "../../admin/assessments/AssessmentResultsPanel.js";
import { usePortalAssessmentDetail } from "./usePortalAssessmentDetail.js";
import "./PortalAssessmentDetailPage.css";

export function PortalAssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PortalAssessmentDetailContent id={id} />;
}

/** Exported for direct testing, the same `*Content` pattern every sibling
 * detail page already follows. Reuses `AssessmentResultsPanel` (EAP-3)
 * directly — it takes only an `AssessmentRecord` prop and has no
 * admin-only dependency, so there is nothing here to build twice. */
export function PortalAssessmentDetailContent({ id }: { id: string }) {
  const state = usePortalAssessmentDetail(id);

  return (
    <div className="titan-portal-assessment-detail">
      <Link to="/portal/assessments" className="titan-portal-assessment-detail__back">
        ← Back to Assessments
      </Link>

      {state.status === "loading" && <LoadingSkeleton lines={6} label="Loading assessment…" />}

      {state.status === "forbidden" && (
        <p className="titan-portal-assessment-detail__note">
          This assessment is not available to your organization.
        </p>
      )}

      {state.status === "error" && (
        <Alert variant="error" title="Could not load this assessment">
          {state.message}
        </Alert>
      )}

      {state.status === "ready" && (
        <Panel title="Assessment results">
          <AssessmentResultsPanel assessment={state.data} />
        </Panel>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  Alert,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  Pagination,
  type DataTableColumn,
} from "@titan/design-system";
import type { AssessmentRecord } from "@titan/platform";
import { RiskBadge } from "../../admin/leads/RiskBadge.js";
import { FrameworkBadge } from "../../admin/assessments/FrameworkBadge.js";
import { usePortalAssessments } from "./usePortalAssessments.js";
import "./PortalAssessmentsPage.css";

/**
 * Assessment History — a customer's own, read-only view of their real
 * assessments. No administrative editing (there is none to have — an
 * assessment has no lifecycle to mutate, `DECISION_LOG.md`'s EAP-3 entry,
 * unchanged by this phase). Reuses `RiskBadge`/`FrameworkBadge` directly
 * rather than duplicating either.
 */
export function PortalAssessmentsPage() {
  const { state, page, pageSize, setPage } = usePortalAssessments();

  return (
    <div className="titan-portal-assessments">
      <h1 className="titan-portal-assessments__title">Assessments</h1>
      <Content state={state} page={page} pageSize={pageSize} setPage={setPage} />
    </div>
  );
}

function Content({ state, page, pageSize, setPage }: ReturnType<typeof usePortalAssessments>) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={4} label="Loading your assessments…" />;
    case "forbidden":
      return (
        <p className="titan-portal-assessments__note">Assessments are currently unavailable.</p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load your assessments">
          {state.message}
        </Alert>
      );
    case "ready": {
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No assessments yet"
            description="Once your organization completes a DPDP assessment, it will show up here."
          />
        );
      }
      const columns: DataTableColumn<AssessmentRecord>[] = [
        {
          id: "createdAt",
          header: "Date",
          render: (assessment) => (
            <Link to={`/portal/assessments/${assessment.id}`}>
              {new Date(assessment.createdAt).toLocaleDateString()}
            </Link>
          ),
        },
        {
          id: "framework",
          header: "Framework",
          render: (assessment) => (
            <FrameworkBadge
              framework={assessment.framework}
              frameworkVersion={assessment.frameworkVersion}
            />
          ),
        },
        {
          id: "riskLevel",
          header: "Risk",
          render: (assessment) => <RiskBadge riskLevel={assessment.result.riskLevel} />,
        },
        {
          id: "score",
          header: "Score",
          align: "right",
          render: (assessment) => `${assessment.result.score} / 100`,
        },
      ];
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.assessments}
            getRowKey={(assessment) => assessment.id}
            caption="Your organization's assessments"
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={state.data.total}
            onPageChange={setPage}
          />
        </>
      );
    }
  }
}

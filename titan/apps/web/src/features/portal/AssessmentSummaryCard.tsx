import { MetricCard } from "@titan/design-system";
import type { PortalAssessmentsReport } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";
import { RiskBadge } from "../admin/leads/RiskBadge.js";
import "./AssessmentSummaryCard.css";

const SEVERITY_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];

export interface AssessmentSummaryCardProps {
  report: PortalAssessmentsReport;
}

/**
 * CPP-1's one genuinely new shared component — two real consumers
 * (`PortalDashboardPage`'s Compliance Summary section and
 * `PortalReportsPage`'s own Compliance Report), the "everything must have
 * multiple consumers" bar this program's own brief sets. Everything else
 * the portal needed already existed: `RiskBadge` is imported directly
 * (same cross-feature-reuse precedent `AssessmentResultsPanel.tsx`
 * already established, not duplicated as a new "ComplianceBadge"), and
 * `MetricCard`/`DataTable`/`Panel`/`Alert`/`EmptyState`/`LoadingSkeleton`
 * are all reused as-is.
 */
export function AssessmentSummaryCard({ report }: AssessmentSummaryCardProps) {
  const highestSeverityWithFindings = SEVERITY_ORDER.find((level) => report.byRiskLevel[level] > 0);

  return (
    <div className="titan-assessment-summary-card">
      <div className="titan-assessment-summary-card__metrics">
        <MetricCard label="Assessments" value={report.total} />
        <MetricCard
          label="Latest assessment"
          value={
            report.latestAssessmentAt
              ? new Date(report.latestAssessmentAt).toLocaleDateString()
              : "—"
          }
          hint={report.latestAssessmentAt ? undefined : "No assessments yet"}
        />
      </div>
      {report.total > 0 && (
        <div className="titan-assessment-summary-card__risk">
          <span className="titan-assessment-summary-card__risk-label">Current risk:</span>
          {highestSeverityWithFindings ? (
            <RiskBadge riskLevel={highestSeverityWithFindings} />
          ) : (
            <RiskBadge riskLevel="low" />
          )}
        </div>
      )}
    </div>
  );
}

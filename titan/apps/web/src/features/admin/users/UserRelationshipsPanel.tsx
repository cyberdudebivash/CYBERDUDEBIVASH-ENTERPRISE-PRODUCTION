import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, LoadingSkeleton } from "@titan/design-system";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { RiskBadge } from "../leads/RiskBadge.js";
import { StatusBadge } from "../leads/StatusBadge.js";
import "./UserRelationshipsPanel.css";

export interface UserRelationshipsPanelProps {
  assignedLeads: SectionState<LeadRecord[]>;
  createdAssessments: SectionState<AssessmentRecord[]>;
}

/**
 * EAP-5: closes the "assign to me/unassign only, no real picker over other
 * admins" limitation named since EAP-2 (`DECISION_LOG.md`'s EAP-2 entry) —
 * not by building a picker here (that's Lead Lifecycle's own control,
 * unchanged), but by finally giving a user's own detail page a real view of
 * what's assigned to them, now that a real user directory exists to link
 * from. Deep links into the existing Lead Intelligence/Assessment Center
 * modules, never duplicating either — same reuse discipline as
 * `OrganizationRelationshipsPanel` (EAP-4). Both lists come from real
 * exact-match filters (`LeadSearchOptions.assignedTo`,
 * `AssessmentSearchOptions.createdBy`), never a fabricated relationship
 * count.
 */
export function UserRelationshipsPanel({
  assignedLeads,
  createdAssessments,
}: UserRelationshipsPanelProps) {
  return (
    <div className="titan-user-relationships">
      <div>
        <h3 className="titan-user-relationships__heading">
          Assigned leads ({assignedLeads.status === "ready" ? assignedLeads.data.length : "…"})
        </h3>
        <RelationshipList
          state={assignedLeads}
          emptyLabel="No leads are assigned to this user."
          renderItem={(lead: LeadRecord) => (
            <li key={lead.id}>
              <Link to={`/admin/leads/${lead.id}`}>{lead.name}</Link>
              <StatusBadge status={lead.status} />
            </li>
          )}
        />
      </div>

      <div>
        <h3 className="titan-user-relationships__heading">
          Created assessments (
          {createdAssessments.status === "ready" ? createdAssessments.data.length : "…"})
        </h3>
        <RelationshipList
          state={createdAssessments}
          emptyLabel="No assessments were created by this user."
          renderItem={(assessment: AssessmentRecord) => (
            <li key={assessment.id}>
              <Link to={`/admin/assessments/${assessment.id}`}>
                #{assessment.id.slice(0, 8)} — {assessment.framework} v{assessment.frameworkVersion}
              </Link>
              <RiskBadge riskLevel={assessment.result.riskLevel} />
            </li>
          )}
        />
      </div>
    </div>
  );
}

function RelationshipList<T>({
  state,
  emptyLabel,
  renderItem,
}: {
  state: SectionState<T[]>;
  emptyLabel: string;
  renderItem: (item: T) => ReactNode;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={2} label="Loading…" />;
    case "forbidden":
      return (
        <p className="titan-user-relationships__note">
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
      if (state.data.length === 0) {
        return <p className="titan-user-relationships__note">{emptyLabel}</p>;
      }
      return <ul className="titan-user-relationships__list">{state.data.map(renderItem)}</ul>;
  }
}

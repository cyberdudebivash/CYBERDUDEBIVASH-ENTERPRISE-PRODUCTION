import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, LoadingSkeleton } from "@titan/design-system";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { RiskBadge } from "../leads/RiskBadge.js";
import { StatusBadge } from "../leads/StatusBadge.js";
import "./OrganizationRelationshipsPanel.css";

export interface OrganizationRelationshipsPanelProps {
  leads: SectionState<LeadRecord[]>;
  assessments: SectionState<AssessmentRecord[]>;
}

/**
 * EAP-4 Workstream 4. Deep links straight into the existing Lead
 * Intelligence and Assessment Center modules — reusing them, never
 * duplicating their own detail views (the brief's explicit instruction).
 * Both lists come from `LeadSearchOptions.organizationId`/
 * `AssessmentSearchOptions.organizationId` (this organization's real linked
 * records), not a fabricated relationship count.
 */
export function OrganizationRelationshipsPanel({
  leads,
  assessments,
}: OrganizationRelationshipsPanelProps) {
  return (
    <div className="titan-organization-relationships">
      <div>
        <h3 className="titan-organization-relationships__heading">
          Leads ({leads.status === "ready" ? leads.data.length : "…"})
        </h3>
        <RelationshipList
          state={leads}
          emptyLabel="No leads are linked to this organization."
          renderItem={(lead: LeadRecord) => (
            <li key={lead.id}>
              <Link to={`/admin/leads/${lead.id}`}>{lead.name}</Link>
              <StatusBadge status={lead.status} />
            </li>
          )}
        />
      </div>

      <div>
        <h3 className="titan-organization-relationships__heading">
          Assessments ({assessments.status === "ready" ? assessments.data.length : "…"})
        </h3>
        <RelationshipList
          state={assessments}
          emptyLabel="No assessments are linked to this organization."
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
        <p className="titan-organization-relationships__note">
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
        return <p className="titan-organization-relationships__note">{emptyLabel}</p>;
      }
      return (
        <ul className="titan-organization-relationships__list">{state.data.map(renderItem)}</ul>
      );
  }
}

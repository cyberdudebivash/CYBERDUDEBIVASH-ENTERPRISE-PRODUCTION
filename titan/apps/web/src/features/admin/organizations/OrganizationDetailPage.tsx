import { Link, useParams } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import type { OrganizationRecord } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { OrganizationAdministrationPanel } from "./OrganizationAdministrationPanel.js";
import { OrganizationAuditPanel } from "./OrganizationAuditPanel.js";
import { OrganizationHealthPanel } from "./OrganizationHealthPanel.js";
import { OrganizationRelationshipsPanel } from "./OrganizationRelationshipsPanel.js";
import { OrganizationStatusBadge } from "./OrganizationStatusBadge.js";
import { useOrganizationDetail } from "./useOrganizationDetail.js";
import "./OrganizationDetailPage.css";

export function OrganizationDetailPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();
  if (session.status !== "authenticated" || !id) return null;
  return <OrganizationDetailContent id={id} />;
}

/** Exported for direct testing, matching AssessmentDetailContent's pattern
 * (EAP-3) — a fixed `id` instead of driving routing/session context per
 * test. Unlike assessments, no `me` is needed here — Organization
 * Administration has no "assign to me"-style self-reference. */
export function OrganizationDetailContent({ id }: { id: string }) {
  const detail = useOrganizationDetail(id);

  return (
    <div className="titan-organization-detail">
      <Link to="/admin/organizations" className="titan-organization-detail__back">
        ← Back to Organizations
      </Link>

      {detail.organization.status === "loading" && (
        <LoadingSkeleton lines={6} label="Loading organization…" />
      )}

      {detail.organization.status === "forbidden" && (
        <p className="titan-organization-detail__note">
          Platform Administrator role required to view this.
        </p>
      )}

      {detail.organization.status === "error" && (
        <Alert variant="error" title="Could not load this organization">
          {detail.organization.message}
        </Alert>
      )}

      {detail.organization.status === "ready" && (
        <OrganizationDetailBody organization={detail.organization.data} detail={detail} />
      )}
    </div>
  );
}

function OrganizationDetailBody({
  organization,
  detail,
}: {
  organization: OrganizationRecord;
  detail: ReturnType<typeof useOrganizationDetail>;
}) {
  return (
    <>
      <div className="titan-organization-detail__heading">
        <h1 className="titan-organization-detail__title">{organization.name}</h1>
        <OrganizationStatusBadge status={organization.status} />
      </div>

      <div className="titan-organization-detail__grid">
        <Panel title="Metadata">
          <dl className="titan-organization-detail__fields">
            <div>
              <dt>Identifier</dt>
              <dd>{organization.slug}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{organization.industry ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>{organization.region ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{organization.tags.length > 0 ? organization.tags.join(", ") : "None"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(organization.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{new Date(organization.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Health">
          <HealthSection assessments={detail.linkedAssessments} leads={detail.linkedLeads} />
        </Panel>

        <Panel title="Relationships">
          <OrganizationRelationshipsPanel
            leads={detail.linkedLeads}
            assessments={detail.linkedAssessments}
          />
        </Panel>

        <Panel title="Administration">
          <OrganizationAdministrationPanel
            organization={organization}
            isSubmitting={detail.isSubmitting}
            submitError={detail.submitError}
            onUpdate={detail.update}
          />
        </Panel>

        <Panel title="Activity & audit history">
          {detail.auditTrail.status === "loading" && (
            <LoadingSkeleton lines={4} label="Loading activity…" />
          )}
          {detail.auditTrail.status === "forbidden" && (
            <p className="titan-organization-detail__note">
              Platform Administrator role required to view this.
            </p>
          )}
          {detail.auditTrail.status === "error" && (
            <Alert variant="error" title="Could not load activity">
              {detail.auditTrail.message}
            </Alert>
          )}
          {detail.auditTrail.status === "ready" && (
            <OrganizationAuditPanel events={detail.auditTrail.data} />
          )}
        </Panel>
      </div>
    </>
  );
}

/** Health is fundamentally assessment-derived, so `assessments` drives which
 * state renders; `leads` (a secondary metric within the panel — "Associated
 * leads") degrades to an empty count rather than blocking the whole panel
 * if it alone is forbidden/errored, which in practice only happens if the
 * two underlying searches somehow diverge in authorization (they're gated
 * identically today). */
function HealthSection({
  assessments,
  leads,
}: {
  assessments: ReturnType<typeof useOrganizationDetail>["linkedAssessments"];
  leads: ReturnType<typeof useOrganizationDetail>["linkedLeads"];
}) {
  switch (assessments.status) {
    case "loading":
      return <LoadingSkeleton lines={4} label="Loading health…" />;
    case "forbidden":
      return (
        <p className="titan-organization-detail__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load health">
          {assessments.message}
        </Alert>
      );
    case "ready":
      return (
        <OrganizationHealthPanel
          assessments={assessments.data}
          leads={leads.status === "ready" ? leads.data : []}
        />
      );
  }
}

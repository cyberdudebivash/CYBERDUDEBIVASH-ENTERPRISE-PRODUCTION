import { useCallback, useEffect, useState } from "react";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadRecord,
  OrganizationPatch,
  OrganizationRecord,
} from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchAssessments } from "../assessments/assessmentApi.js";
import { searchLeads } from "../leads/leadApi.js";
import {
  fetchOrganization,
  fetchOrganizationAuditTrail,
  updateOrganization,
} from "./organizationApi.js";

export interface UseOrganizationDetail {
  organization: SectionState<OrganizationRecord>;
  auditTrail: SectionState<AuditEventRecord[]>;
  /** Leads linked to this organization (`LeadRecord.organizationId`) —
   * Organization Relationships. Platform-Administrator-only, same as the
   * underlying `GET /api/leads/search` (SECURITY_GUIDE.md's existing
   * cross-org gap). */
  linkedLeads: SectionState<LeadRecord[]>;
  /** Assessments linked to this organization
   * (`AssessmentRecord.organizationId`) — Organization Relationships and
   * Organization Health both derive from this same fetch, so it's owned
   * here once rather than fetched twice. */
  linkedAssessments: SectionState<AssessmentRecord[]>;
  isSubmitting: boolean;
  submitError: string | null;
  update: (patch: OrganizationPatch & { note?: string }) => Promise<void>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

/**
 * Owns everything Organization Details/Health/Relationships/Administration/
 * Audit need for one organization — same overall shape as
 * `useAssessmentDetail`/`useLeadDetail`, applying from the start the fix
 * those two hooks only gained once real-browser verification caught the
 * race: the audit-trail fetch is sequenced to start only after the
 * organization fetch resolves, not fired in parallel with it (`getOrganization`
 * in router.ts awaits its own `organization.viewed` write before returning).
 */
export function useOrganizationDetail(id: string): UseOrganizationDetail {
  const [organization, setOrganization] = useState<SectionState<OrganizationRecord>>({
    status: "loading",
  });
  const [auditTrail, setAuditTrail] = useState<SectionState<AuditEventRecord[]>>({
    status: "loading",
  });
  const [linkedLeads, setLinkedLeads] = useState<SectionState<LeadRecord[]>>({ status: "loading" });
  const [linkedAssessments, setLinkedAssessments] = useState<SectionState<AssessmentRecord[]>>({
    status: "loading",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setOrganization({ status: "loading" });
    setAuditTrail({ status: "loading" });

    fetchOrganization(id)
      .then((data) => {
        if (cancelled) return;
        setOrganization({ status: "ready", data });
        return fetchOrganizationAuditTrail(id)
          .then((auditData) => {
            if (!cancelled) setAuditTrail({ status: "ready", data: auditData });
          })
          .catch((error: unknown) => {
            if (!cancelled) setAuditTrail(toSectionState(error));
          });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const state = toSectionState(error);
        setOrganization(state);
        setAuditTrail(state);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refetchToken]);

  useEffect(() => {
    if (organization.status !== "ready") {
      setLinkedLeads({ status: "loading" });
      setLinkedAssessments({ status: "loading" });
      return;
    }
    let cancelled = false;
    const organizationId = organization.data.id;

    searchLeads({ organizationId, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setLinkedLeads({ status: "ready", data: result.leads });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLinkedLeads(toSectionState(error));
      });

    searchAssessments({ organizationId, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setLinkedAssessments({ status: "ready", data: result.assessments });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLinkedAssessments(toSectionState(error));
      });

    return () => {
      cancelled = true;
    };
  }, [organization]);

  const update = useCallback(
    async (patch: OrganizationPatch & { note?: string }) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await updateOrganization(id, patch);
        setRefetchToken((token) => token + 1);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Could not update this organization.",
        );
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [id],
  );

  return {
    organization,
    auditTrail,
    linkedLeads,
    linkedAssessments,
    isSubmitting,
    submitError,
    update,
  };
}

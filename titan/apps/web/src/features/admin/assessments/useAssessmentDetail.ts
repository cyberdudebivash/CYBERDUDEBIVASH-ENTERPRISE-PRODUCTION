import { useEffect, useState } from "react";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadRecord,
  OrganizationRecord,
} from "@titan/platform";
import { ApiError, getJson } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchLeads } from "../leads/leadApi.js";
import { fetchAssessment, fetchAssessmentAuditTrail } from "./assessmentApi.js";

export interface UseAssessmentDetail {
  assessment: SectionState<AssessmentRecord>;
  auditTrail: SectionState<AuditEventRecord[]>;
  /** Resolves the assessment's `organizationId` to a real name via the
   * existing `GET /api/organizations` (EAP-1) — same reuse `useLeadDetail`
   * already established, not new backend work. `null` when the assessment
   * has no organizationId at all. */
  organizationName: string | null | undefined;
  /** Leads this assessment produced, if any (`LeadRecord.assessmentId`) —
   * "Lead linkage". Platform-Administrator-only, same as the underlying
   * `GET /api/leads/search` (SECURITY_GUIDE.md's existing cross-org gap) —
   * an organization member who can see the assessment itself may still see
   * `{status: "forbidden"}` here specifically, which is a real, already-
   * documented authorization boundary, not a bug this hook introduces. */
  linkedLeads: SectionState<LeadRecord[]>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

/**
 * Owns everything Assessment Details/Results/Audit/Lead-linkage need for one
 * assessment — same overall shape as `useLeadDetail` (EAP-2), applying from
 * the start a fix `useLeadDetail` only gained during this phase's real-
 * browser verification: the audit-trail fetch is sequenced to start only
 * after the assessment fetch resolves, not fired in parallel with it.
 * `getAssessment` (router.ts) awaits its own `assessment.viewed` write
 * before returning, so firing the audit-trail read only after that response
 * lands guarantees the just-created event already exists server-side —
 * firing both requests in parallel left a real race where the trail read
 * could reach the server and complete before the view-write did, silently
 * missing the caller's own "viewed" event on that same page load.
 */
export function useAssessmentDetail(id: string): UseAssessmentDetail {
  const [assessment, setAssessment] = useState<SectionState<AssessmentRecord>>({
    status: "loading",
  });
  const [auditTrail, setAuditTrail] = useState<SectionState<AuditEventRecord[]>>({
    status: "loading",
  });
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [linkedLeads, setLinkedLeads] = useState<SectionState<LeadRecord[]>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    setAssessment({ status: "loading" });
    setAuditTrail({ status: "loading" });

    fetchAssessment(id)
      .then((data) => {
        if (cancelled) return;
        setAssessment({ status: "ready", data });
        return fetchAssessmentAuditTrail(id)
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
        setAssessment(state);
        setAuditTrail(state);
      });

    getJson<OrganizationRecord[]>("/api/organizations")
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch(() => {
        if (!cancelled) setOrganizations([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (assessment.status !== "ready") {
      setLinkedLeads({ status: "loading" });
      return;
    }
    let cancelled = false;
    const assessmentId = assessment.data.id;
    searchLeads({ assessmentId, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setLinkedLeads({ status: "ready", data: result.leads });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLinkedLeads(toSectionState(error));
      });
    return () => {
      cancelled = true;
    };
  }, [assessment]);

  const organizationName =
    assessment.status === "ready"
      ? assessment.data.organizationId
        ? (organizations.find((org) => org.id === assessment.data.organizationId)?.name ??
          assessment.data.organizationId)
        : null
      : undefined;

  return { assessment, auditTrail, organizationName, linkedLeads };
}

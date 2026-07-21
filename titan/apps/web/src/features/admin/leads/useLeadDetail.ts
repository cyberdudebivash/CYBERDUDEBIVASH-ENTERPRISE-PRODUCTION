import { useCallback, useEffect, useState } from "react";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadLifecyclePatch,
  LeadRecord,
  OrganizationRecord,
} from "@titan/platform";
import { ApiError, getJson } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { fetchLead, fetchLeadAuditTrail, updateLead } from "./leadApi.js";

export interface UseLeadDetail {
  lead: SectionState<LeadRecord>;
  auditTrail: SectionState<AuditEventRecord[]>;
  /** Resolves the lead's `organizationId` to a real name via the existing
   * `GET /api/organizations` (EAP-1) — reusing an endpoint that already
   * exists for exactly this kind of admin display, not new backend work
   * (Organization Management's own detail view is a later EAP phase,
   * ROADMAP.md). `null` when the lead has no organizationId at all. */
  organizationName: string | null | undefined;
  /** The lead's own linked assessment record (`GET /api/assessments/:id`,
   * Security Release Blocker Sprint), when `assessmentId` is set — most
   * leads (the public scan flow) don't have one, in which case this is
   * `undefined`, not a fabricated "loading forever" state. */
  linkedAssessment: AssessmentRecord | undefined;
  isSubmitting: boolean;
  submitError: string | null;
  updateLifecycle: (patch: LeadLifecyclePatch & { note?: string }) => Promise<void>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

/**
 * Owns everything Lead Details/Lifecycle/Risk Intelligence/Audit history
 * need for one lead — one fetch of the lead itself, one of its own
 * `entityType=lead&entityId=` audit trail (EAP-2's server-side filter, not
 * the whole audit table), one of the organization list (to resolve a real
 * name, not a raw id). `updateLifecycle` calls `PATCH /api/leads/:id` then
 * refetches the lead and its audit trail — the same "trust the server's
 * own re-read over the mutation response" caution `useDashboardData`'s
 * sibling hooks already follow.
 */
export function useLeadDetail(id: string): UseLeadDetail {
  const [lead, setLead] = useState<SectionState<LeadRecord>>({ status: "loading" });
  const [auditTrail, setAuditTrail] = useState<SectionState<AuditEventRecord[]>>({
    status: "loading",
  });
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [linkedAssessment, setLinkedAssessment] = useState<AssessmentRecord | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  // Real bug this hook's own real-browser E2E verification caught (not a
  // hypothetical one): with no `cancelled` guard here, React 19's
  // StrictMode double-invoking this effect in dev (main.tsx wraps the app
  // in <StrictMode>) could let a stale first-mount response resolve
  // *after* the fresh response from an `updateLifecycle`-triggered
  // refetch, silently reverting the UI to pre-update data with no visible
  // error. Every setState below is guarded the same way
  // `useDashboardData`/`useLeadSearch` already guard theirs — this hook
  // had simply drifted from that established pattern.
  useEffect(() => {
    let cancelled = false;

    setLead({ status: "loading" });
    setAuditTrail({ status: "loading" });

    fetchLead(id)
      .then((data) => {
        if (!cancelled) setLead({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLead(toSectionState(error));
      });

    fetchLeadAuditTrail(id)
      .then((data) => {
        if (!cancelled) setAuditTrail({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setAuditTrail(toSectionState(error));
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
  }, [id, refetchToken]);

  useEffect(() => {
    if (lead.status !== "ready" || !lead.data.assessmentId) {
      setLinkedAssessment(undefined);
      return;
    }
    let cancelled = false;
    getJson<AssessmentRecord>(`/api/assessments/${lead.data.assessmentId}`)
      .then((data) => {
        if (!cancelled) setLinkedAssessment(data);
      })
      .catch(() => {
        if (!cancelled) setLinkedAssessment(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [lead]);

  const updateLifecycle = useCallback(
    async (patch: LeadLifecyclePatch & { note?: string }) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await updateLead(id, patch);
        setRefetchToken((token) => token + 1);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Could not update this lead.");
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [id],
  );

  const organizationName =
    lead.status === "ready"
      ? lead.data.organizationId
        ? (organizations.find((org) => org.id === lead.data.organizationId)?.name ??
          lead.data.organizationId)
        : null
      : undefined;

  return {
    lead,
    auditTrail,
    organizationName,
    linkedAssessment,
    isSubmitting,
    submitError,
    updateLifecycle,
  };
}

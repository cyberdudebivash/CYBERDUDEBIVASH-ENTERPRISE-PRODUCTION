import { useCallback, useEffect, useState } from "react";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadRecord,
  OrganizationRecord,
  UserRole,
} from "@titan/platform";
import { ApiError, getJson } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchAssessments } from "../assessments/assessmentApi.js";
import { searchLeads } from "../leads/leadApi.js";
import {
  fetchUser,
  fetchUserAuditTrail,
  grantUserProfile,
  revokeUserProfile,
  updateUserProfile,
  type UserWithProfiles,
} from "./userApi.js";

export interface UseUserDetail {
  user: SectionState<UserWithProfiles>;
  auditTrail: SectionState<AuditEventRecord[]>;
  /** Every organization, unfiltered — same `GET /api/organizations` call
   * `useDashboardData` already makes, reused here to resolve each profile's
   * `organizationId` to a real name and to populate Role Assignment's grant
   * form. Not `SectionState`-wrapped: a Platform Administrator (the only
   * caller who ever reaches this page) always has access to this endpoint,
   * and a failure here degrades gracefully to showing raw ids rather than
   * blocking the whole page. */
  organizations: OrganizationRecord[];
  /** Leads assigned to this user (`LeadRecord.assignedTo`) — User
   * Relationships, closing the "assign to me/unassign only, no real
   * picker" gap named since EAP-2 now that a real user directory exists
   * (`DECISION_LOG.md`'s EAP-2 entry). */
  assignedLeads: SectionState<LeadRecord[]>;
  /** Assessments created by this user (`AssessmentRecord.createdBy`) —
   * User Relationships' other half. */
  createdAssessments: SectionState<AssessmentRecord[]>;
  isSubmitting: boolean;
  submitError: string | null;
  grant: (organizationId: string | null, role: UserRole) => Promise<void>;
  changeRole: (profileId: string, role: UserRole) => Promise<void>;
  revoke: (profileId: string) => Promise<void>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

/**
 * Owns everything User Details/Role Assignment/Relationships/Audit need for
 * one user — same overall shape as `useOrganizationDetail`, applying the
 * audit-trail sequencing fix from the start (`getUser` in router.ts awaits
 * its own `user.viewed` write before returning, so the trail fetch starts
 * only after the user fetch resolves, not in parallel with it — the exact
 * race `DECISION_LOG.md`'s EAP-3 entry found and fixed in `useLeadDetail`).
 */
export function useUserDetail(id: string): UseUserDetail {
  const [user, setUser] = useState<SectionState<UserWithProfiles>>({ status: "loading" });
  const [auditTrail, setAuditTrail] = useState<SectionState<AuditEventRecord[]>>({
    status: "loading",
  });
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<SectionState<LeadRecord[]>>({
    status: "loading",
  });
  const [createdAssessments, setCreatedAssessments] = useState<SectionState<AssessmentRecord[]>>({
    status: "loading",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setUser({ status: "loading" });
    setAuditTrail({ status: "loading" });

    fetchUser(id)
      .then((data) => {
        if (cancelled) return;
        setUser({ status: "ready", data });
        return fetchUserAuditTrail(id)
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
        setUser(state);
        setAuditTrail(state);
      });

    getJson<OrganizationRecord[]>("/api/organizations")
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch(() => {
        // Degrades to raw ids (Role Assignment still works via typed-in
        // organization ids) rather than blocking the page — see this
        // field's own doc comment.
      });

    return () => {
      cancelled = true;
    };
  }, [id, refetchToken]);

  useEffect(() => {
    let cancelled = false;

    searchLeads({ assignedTo: id, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setAssignedLeads({ status: "ready", data: result.leads });
      })
      .catch((error: unknown) => {
        if (!cancelled) setAssignedLeads(toSectionState(error));
      });

    searchAssessments({ createdBy: id, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setCreatedAssessments({ status: "ready", data: result.assessments });
      })
      .catch((error: unknown) => {
        if (!cancelled) setCreatedAssessments(toSectionState(error));
      });

    return () => {
      cancelled = true;
    };
  }, [id, refetchToken]);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  const grant = useCallback(
    async (organizationId: string | null, role: UserRole) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await grantUserProfile(id, { organizationId, role });
        refetch();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Could not grant this role.");
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, refetch],
  );

  const changeRole = useCallback(
    async (profileId: string, role: UserRole) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await updateUserProfile(id, profileId, role);
        refetch();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Could not change this role.");
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, refetch],
  );

  const revoke = useCallback(
    async (profileId: string) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await revokeUserProfile(id, profileId);
        refetch();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Could not revoke this role.");
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, refetch],
  );

  return {
    user,
    auditTrail,
    organizations,
    assignedLeads,
    createdAssessments,
    isSubmitting,
    submitError,
    grant,
    changeRole,
    revoke,
  };
}

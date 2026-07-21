import { useEffect, useState } from "react";
import type { SupportRequestRecord } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { createPortalSupportRequest, fetchPortalSupportRequests } from "../portalApi.js";

export interface UsePortalSupport {
  requests: SectionState<SupportRequestRecord[]>;
  isSubmitting: boolean;
  submitError: string | null;
  submit: (input: { subject: string; message: string }) => Promise<boolean>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load your support requests.",
  };
}

/**
 * Support Requests — real create + real history, no ticketing platform:
 * `status` only ever comes back `"open"` today (no admin-side resolution
 * endpoint exists yet, `repositories/types.ts`'s own `SupportRequestStatus`
 * comment), and this hook re-reads the server's own list after a
 * successful submission (`load()` again) rather than optimistically
 * inserting a locally-built record — the same "never optimistic-only"
 * discipline `RoleAssignmentPanel`/`OrganizationAdministrationPanel`
 * already established for a real server round trip.
 */
export function usePortalSupport(): UsePortalSupport {
  const [requests, setRequests] = useState<SectionState<SupportRequestRecord[]>>({
    status: "loading",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    fetchPortalSupportRequests()
      .then((data) => setRequests({ status: "ready", data }))
      .catch((error: unknown) => setRequests(toSectionState(error)));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(input: { subject: string; message: string }): Promise<boolean> {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createPortalSupportRequest(input);
      load();
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not submit your request.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { requests, isSubmitting, submitError, submit };
}

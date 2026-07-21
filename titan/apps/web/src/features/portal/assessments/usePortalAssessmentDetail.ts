import { useEffect, useState } from "react";
import type { AssessmentRecord } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { fetchAssessment } from "../../admin/assessments/assessmentApi.js";

/**
 * Reuses the *existing* `GET /api/assessments/:id` directly (no new
 * backend route) — it already delegates to an organization member of the
 * assessment's own organization (`requireAssessmentAccess`, Security
 * Release Blocker Sprint/EAP-2), the exact access a customer needs. This
 * hook is deliberately smaller than the admin `useAssessmentDetail`: no
 * audit trail (the underlying `GET /api/audit` stays Platform-
 * Administrator-only — showing a section that would always resolve
 * "forbidden" would be misleading chrome, not real functionality) and no
 * Lead linkage (leads are never associated with an organization in this
 * data model, so it has no meaning for a customer view at all).
 */
export function usePortalAssessmentDetail(id: string): SectionState<AssessmentRecord> {
  const [state, setState] = useState<SectionState<AssessmentRecord>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetchAssessment(id)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load this assessment.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

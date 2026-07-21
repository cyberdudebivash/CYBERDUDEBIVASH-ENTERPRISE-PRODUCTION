import { useEffect, useState } from "react";
import type { AssessmentSearchResult } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { fetchPortalAssessments } from "../portalApi.js";

const PAGE_SIZE = 20;

export interface UsePortalAssessments {
  state: SectionState<AssessmentSearchResult>;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
}

/** Assessment History — the same `AssessmentRepository.search` the admin
 * Assessment Workspace calls, scoped server-side to the caller's own
 * organization (`GET /api/portal/assessments`). Deliberately smaller than
 * `useAssessmentSearch.ts`: no free-text search, no framework/risk filter,
 * no saved filters — a customer's own organization has a real, small
 * assessment history, not the platform-wide volume the admin Workspace's
 * own filtering exists for. */
export function usePortalAssessments(): UsePortalAssessments {
  const [state, setState] = useState<SectionState<AssessmentSearchResult>>({ status: "loading" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetchPortalAssessments({ page, pageSize: PAGE_SIZE })
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
          message: error instanceof Error ? error.message : "Could not load your assessments.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  return { state, page, pageSize: PAGE_SIZE, setPage };
}

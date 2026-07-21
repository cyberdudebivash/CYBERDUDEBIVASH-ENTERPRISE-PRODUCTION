import { useEffect, useState } from "react";
import type { PortalComplianceSummary } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { fetchPortalComplianceSummary } from "../portalApi.js";

export function usePortalReports(): SectionState<PortalComplianceSummary> {
  const [state, setState] = useState<SectionState<PortalComplianceSummary>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchPortalComplianceSummary()
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
          message: error instanceof Error ? error.message : "Could not load your reports.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

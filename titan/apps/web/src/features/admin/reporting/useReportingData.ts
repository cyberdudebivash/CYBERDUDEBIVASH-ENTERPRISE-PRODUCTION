import { useEffect, useState } from "react";
import type { ExecutiveSummary } from "@titan/platform";
import type { MeResponse } from "../auth/session.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { fetchReportingSummary } from "./reportingApi.js";

export interface ReportingData {
  summary: SectionState<ExecutiveSummary>;
}

/** Same `SectionState`/gated-fetch convention `useOperationsData.ts`
 * already established: a non-Platform-Administrator resolves straight to
 * `"forbidden"` without firing a request that would just 403 predictably —
 * `GET /api/reports/summary` composes every module's own data, the same
 * cross-cutting reasoning Operations' own summary endpoint has. */
export function useReportingData(me: MeResponse): ReportingData {
  const [data, setData] = useState<ReportingData>({ summary: { status: "loading" } });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!me.isPlatformAdministrator) {
        if (!cancelled) setData({ summary: { status: "forbidden" } });
        return;
      }
      try {
        const summary = await fetchReportingSummary();
        if (!cancelled) setData({ summary: { status: "ready", data: summary } });
      } catch (error) {
        if (!cancelled) {
          setData({
            summary: {
              status: "error",
              message: error instanceof Error ? error.message : "Could not load this data.",
            },
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [me.isPlatformAdministrator]);

  return data;
}

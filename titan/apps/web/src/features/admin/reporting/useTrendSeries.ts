import { useEffect, useState } from "react";
import type { ReportTrendEntity, TrendSeries } from "@titan/platform";
import type { MeResponse } from "../auth/session.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { fetchReportTrends } from "./reportingApi.js";

/** Same `SectionState`-per-fetch convention as `useReportingData.ts`, but
 * re-fetches whenever the caller's chosen `entity`/`days` changes — the
 * Analytics panel's own entity selector, not a fixed on-mount load. */
export function useTrendSeries(
  me: MeResponse,
  entity: ReportTrendEntity,
  days: number,
): SectionState<TrendSeries> {
  const [state, setState] = useState<SectionState<TrendSeries>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!me.isPlatformAdministrator) {
        if (!cancelled) setState({ status: "forbidden" });
        return;
      }
      setState({ status: "loading" });
      try {
        const series = await fetchReportTrends(entity, days);
        if (!cancelled) setState({ status: "ready", data: series });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load this data.",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [me.isPlatformAdministrator, entity, days]);

  return state;
}

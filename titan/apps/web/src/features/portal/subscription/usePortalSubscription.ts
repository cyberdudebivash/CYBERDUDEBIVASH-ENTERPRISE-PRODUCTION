import { useCallback, useEffect, useState } from "react";
import type { Plan } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { fetchPlans, fetchPortalCommercialSummary } from "../../admin/commercial/commercialApi.js";
import type { PortalCommercialSummary } from "../../admin/commercial/commercialApi.js";

export interface UsePortalSubscription {
  summary: SectionState<PortalCommercialSummary>;
  plans: SectionState<Plan[]>;
  reload: () => void;
}

/** COM-1: the Customer Portal's own Commercial Dashboard/Subscription
 * page's data — two independent sections, the same "each section loads and
 * fails on its own" convention `usePortalDashboard` (CPP-1) already
 * established. `plans` is fetched once (the catalog is static and
 * open to any authenticated caller, `GET /api/commercial/plans`); `summary`
 * re-fetches whenever `reload()` is called, the way this page's own
 * subscribe/upgrade/downgrade/cancel/renew actions need to see their own
 * real effect reflected without a full page remount. */
export function usePortalSubscription(): UsePortalSubscription {
  const [summary, setSummary] = useState<SectionState<PortalCommercialSummary>>({
    status: "loading",
  });
  const [plans, setPlans] = useState<SectionState<Plan[]>>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSummary({ status: "loading" });

    fetchPortalCommercialSummary()
      .then((data) => {
        if (!cancelled) setSummary({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setSummary({ status: "forbidden" });
          return;
        }
        setSummary({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load your subscription.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    let cancelled = false;

    fetchPlans()
      .then((data) => {
        if (!cancelled) setPlans({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPlans({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load available plans.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { summary, plans, reload };
}

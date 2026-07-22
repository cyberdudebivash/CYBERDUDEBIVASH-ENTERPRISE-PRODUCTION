import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import type { CommercialSubscriptionDetail } from "./commercialApi.js";
import { fetchCommercialSubscription } from "./commercialApi.js";

export interface UseCommercialSubscriptionDetail {
  state: SectionState<CommercialSubscriptionDetail>;
  reload: () => void;
}

/** COM-1: the admin Commercial Detail page's own data — same `SectionState`
 * convention every sibling Detail page's hook already uses. `reload`
 * (rather than a full remount) is how the page refreshes after an admin
 * override PATCH succeeds — the same "re-fetch after a real write" pattern
 * `useAssessmentDetail`/`useOrganizationDetail` already established. */
export function useCommercialSubscriptionDetail(id: string): UseCommercialSubscriptionDetail {
  const [state, setState] = useState<SectionState<CommercialSubscriptionDetail>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetchCommercialSubscription(id)
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
          message: error instanceof Error ? error.message : "Could not load this subscription.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { state, reload };
}

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { fetchDpdpScannerAccess } from "./dpdpScannerApi.js";

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

export interface UseDpdpScannerAccess {
  access: SectionState<boolean>;
  /** Re-fetches — called after a payment is verified, so the paywall flips
   * to the real scanner the moment access is actually granted server-side,
   * rather than the client optimistically assuming success. */
  reload: () => void;
}

/**
 * Whether this organization can run the DPDP Compliance Scanner right now
 * — a dedicated fetch of `GET /api/portal/dpdp-scanner/access`
 * (`hasVerifiedDpdpScannerAccess`, `router.ts`), deliberately its own hook
 * rather than folded into `usePortalDashboard`: the scanner card
 * (dashboard) and the scanner page itself both need this same state, and
 * neither is part of the dashboard's own three-section payload.
 */
export function useDpdpScannerAccess(): UseDpdpScannerAccess {
  const [access, setAccess] = useState<SectionState<boolean>>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setAccess({ status: "loading" });

    fetchDpdpScannerAccess()
      .then((result) => {
        if (!cancelled) setAccess({ status: "ready", data: result.hasAccess });
      })
      .catch((error: unknown) => {
        if (!cancelled) setAccess(toSectionState(error));
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { access, reload };
}

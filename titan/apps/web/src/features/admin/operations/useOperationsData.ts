import { useEffect, useState } from "react";
import type { OperationsSummary } from "@titan/platform";
import { getJson } from "../../../lib/apiClient.js";
import type { HealthPayload, SectionState } from "../dashboard/useDashboardData.js";
import type { MeResponse } from "../auth/session.js";
import { fetchOperationsSummary } from "./operationsApi.js";

export interface OperationsData {
  health: SectionState<HealthPayload>;
  readiness: SectionState<HealthPayload>;
  summary: SectionState<OperationsSummary>;
}

function loadingState<T>(): SectionState<T> {
  return { status: "loading" };
}

/** Same `loadSection`/`SectionState` convention `useDashboardData.ts`
 * already established — one section's 403/network failure never blocks
 * the others from rendering their own real data. Health/readiness are
 * role-agnostic and always fetched, mirroring the Dashboard's own
 * precedent exactly; `summary` is Platform-Administrator-gated (it
 * composes every module's own data), so it resolves straight to
 * `"forbidden"` for anyone else rather than firing a request that would
 * just 403 predictably. */
export function useOperationsData(me: MeResponse): OperationsData {
  const [data, setData] = useState<OperationsData>({
    health: loadingState(),
    readiness: loadingState(),
    summary: loadingState(),
  });

  useEffect(() => {
    let cancelled = false;
    const setIfActive = (patch: Partial<OperationsData>) => {
      if (!cancelled) setData((current) => ({ ...current, ...patch }));
    };

    async function loadHealth() {
      try {
        const health = await getJson<HealthPayload>("/health");
        setIfActive({ health: { status: "ready", data: health } });
      } catch (error) {
        setIfActive({
          health: {
            status: "error",
            message: error instanceof Error ? error.message : "Could not load this data.",
          },
        });
      }
    }

    async function loadReadiness() {
      try {
        const readiness = await getJson<HealthPayload>("/health/ready");
        setIfActive({ readiness: { status: "ready", data: readiness } });
      } catch (error) {
        setIfActive({
          readiness: {
            status: "error",
            message: error instanceof Error ? error.message : "Could not load this data.",
          },
        });
      }
    }

    async function loadSummary() {
      if (!me.isPlatformAdministrator) {
        setIfActive({ summary: { status: "forbidden" } });
        return;
      }
      try {
        const summary = await fetchOperationsSummary();
        setIfActive({ summary: { status: "ready", data: summary } });
      } catch (error) {
        setIfActive({
          summary: {
            status: "error",
            message: error instanceof Error ? error.message : "Could not load this data.",
          },
        });
      }
    }

    loadHealth();
    loadReadiness();
    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [me.isPlatformAdministrator]);

  return data;
}

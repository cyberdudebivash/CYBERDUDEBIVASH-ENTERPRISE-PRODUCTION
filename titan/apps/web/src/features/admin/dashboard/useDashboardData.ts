import { useEffect, useState } from "react";
import type { AssessmentRecord, AuditEventRecord, OrganizationRecord } from "@titan/platform";
import { ApiError, getJson } from "../../../lib/apiClient.js";
import { fetchLeads, type LeadRecord } from "../../dpdp-assessment/leadStore.js";
import type { MeResponse } from "../auth/session.js";

export type SectionState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export interface HealthPayload {
  status: string;
  service: string;
}

export interface DashboardData {
  leads: SectionState<LeadRecord[]>;
  assessments: SectionState<AssessmentRecord[]>;
  organizations: SectionState<OrganizationRecord[]>;
  audit: SectionState<AuditEventRecord[]>;
  health: SectionState<HealthPayload>;
  readiness: SectionState<HealthPayload>;
}

function loadingState<T>(): SectionState<T> {
  return { status: "loading" };
}

async function loadSection<T>(fetcher: () => Promise<T>): Promise<SectionState<T>> {
  try {
    return { status: "ready", data: await fetcher() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { status: "forbidden" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not load this data.",
    };
  }
}

/**
 * Fetches everything the Dashboard's sections need, each independently —
 * one section failing (a 403, a network error) doesn't block the others
 * from rendering their own real data. Platform-Administrator-gated sections
 * (leads/assessments/organizations/audit — `SECURITY_GUIDE.md`'s
 * authorization model) are only actually fetched for a real Platform
 * Administrator; for anyone else they resolve straight to `"forbidden"`
 * without firing a request that would just 403 predictably. Health/
 * readiness are role-agnostic and always fetched.
 */
export function useDashboardData(me: MeResponse): DashboardData {
  const [data, setData] = useState<DashboardData>({
    leads: loadingState(),
    assessments: loadingState(),
    organizations: loadingState(),
    audit: loadingState(),
    health: loadingState(),
    readiness: loadingState(),
  });

  useEffect(() => {
    let cancelled = false;
    const setIfActive = (patch: Partial<DashboardData>) => {
      if (!cancelled) setData((current) => ({ ...current, ...patch }));
    };

    if (me.isPlatformAdministrator) {
      loadSection(fetchLeads).then((leads) => setIfActive({ leads }));
      loadSection(() => getJson<AssessmentRecord[]>("/api/assessments")).then((assessments) =>
        setIfActive({ assessments }),
      );
      loadSection(() => getJson<OrganizationRecord[]>("/api/organizations")).then((organizations) =>
        setIfActive({ organizations }),
      );
      loadSection(() => getJson<AuditEventRecord[]>("/api/audit")).then((audit) =>
        setIfActive({ audit }),
      );
    } else {
      setIfActive({
        leads: { status: "forbidden" },
        assessments: { status: "forbidden" },
        organizations: { status: "forbidden" },
        audit: { status: "forbidden" },
      });
    }

    loadSection(() => getJson<HealthPayload>("/health")).then((health) => setIfActive({ health }));
    loadSection(() => getJson<HealthPayload>("/health/ready")).then((readiness) =>
      setIfActive({ readiness }),
    );

    return () => {
      cancelled = true;
    };
  }, [me.isPlatformAdministrator]);

  return data;
}

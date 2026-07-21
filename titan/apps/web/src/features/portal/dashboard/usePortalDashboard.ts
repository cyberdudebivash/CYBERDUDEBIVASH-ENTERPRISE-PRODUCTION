import { useEffect, useState } from "react";
import type {
  AuditEventRecord,
  OrganizationRecord,
  PortalComplianceSummary,
} from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import {
  fetchPortalActivity,
  fetchPortalComplianceSummary,
  fetchPortalOrganization,
} from "../portalApi.js";

export interface PortalDashboardData {
  organization: SectionState<OrganizationRecord>;
  complianceSummary: SectionState<PortalComplianceSummary>;
  activity: SectionState<AuditEventRecord[]>;
}

function toSectionState(error: unknown): SectionState<never> {
  if (error instanceof ApiError && error.status === 403) return { status: "forbidden" };
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Could not load this data.",
  };
}

async function loadSection<T>(fetcher: () => Promise<T>): Promise<SectionState<T>> {
  try {
    return { status: "ready", data: await fetcher() };
  } catch (error) {
    return toSectionState(error);
  }
}

/**
 * Owns the Portal Dashboard's three independently-loading sections —
 * Organization Overview, Compliance Summary, and Recent Activity — the
 * same `SectionState<T>`/per-section-`loadSection` convention
 * `useDashboardData.ts` (EAP-1) established, reused rather than
 * reinvented. Unlike the admin Dashboard, there is no role-agnostic
 * section here: every `/api/portal/*` route requires a real organization
 * membership, so all three sections load together, gated only by
 * `PortalLayout`'s own honest "no organization membership" state one
 * level up.
 */
export function usePortalDashboard(): PortalDashboardData {
  const [organization, setOrganization] = useState<SectionState<OrganizationRecord>>({
    status: "loading",
  });
  const [complianceSummary, setComplianceSummary] = useState<SectionState<PortalComplianceSummary>>(
    { status: "loading" },
  );
  const [activity, setActivity] = useState<SectionState<AuditEventRecord[]>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadSection(fetchPortalOrganization).then((state) => {
      if (!cancelled) setOrganization(state);
    });
    loadSection(fetchPortalComplianceSummary).then((state) => {
      if (!cancelled) setComplianceSummary(state);
    });
    loadSection(fetchPortalActivity).then((state) => {
      if (!cancelled) setActivity(state);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { organization, complianceSummary, activity };
}

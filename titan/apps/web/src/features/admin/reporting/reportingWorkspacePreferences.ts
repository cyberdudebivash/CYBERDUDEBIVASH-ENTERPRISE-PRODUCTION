import type { ReportTrendEntity } from "@titan/platform";
import { REPORT_TREND_ENTITIES } from "@titan/platform";

/**
 * The Analytics panel's own selection (EAP-8 Workstream 6, "Saved Reports")
 * — same `localStorage`-backed, per-browser, real-but-not-synced approach
 * as `auditWorkspacePreferences.ts`/`organizationWorkspacePreferences.ts`,
 * including the same defensive (try/catch, shape-checked) reads. There is
 * no server-side "saved views" table anywhere in this system
 * (`DECISION_LOG.md`'s EAP-2 entry already named this as a deliberate,
 * honest limitation rather than new persistence this codebase would need
 * to justify); this reuses that exact precedent instead of inventing one.
 */

export interface ReportingViewPreference {
  entity: ReportTrendEntity;
  days: number;
}

const VIEW_PREFERENCE_KEY = "titan-admin-reporting-view";

const DEFAULT_PREFERENCE: ReportingViewPreference = { entity: "leads", days: 30 };

export function getReportingViewPreference(): ReportingViewPreference {
  try {
    const raw = localStorage.getItem(VIEW_PREFERENCE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    const parsed = JSON.parse(raw) as Partial<ReportingViewPreference>;
    const entity = REPORT_TREND_ENTITIES.includes(parsed.entity as ReportTrendEntity)
      ? (parsed.entity as ReportTrendEntity)
      : DEFAULT_PREFERENCE.entity;
    const days =
      typeof parsed.days === "number" && Number.isInteger(parsed.days) && parsed.days > 0
        ? parsed.days
        : DEFAULT_PREFERENCE.days;
    return { entity, days };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function setReportingViewPreference(preference: ReportingViewPreference): void {
  try {
    localStorage.setItem(VIEW_PREFERENCE_KEY, JSON.stringify(preference));
  } catch {
    // Quota exceeded or storage disabled — a saved view not persisting is a
    // minor UX regression, not something worth surfacing as an error.
  }
}

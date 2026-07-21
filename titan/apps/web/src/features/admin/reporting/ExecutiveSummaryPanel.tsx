import { MetricCard } from "@titan/design-system";
import type { ExecutiveSummary } from "@titan/platform";
import "./ExecutiveSummaryPanel.css";

export interface ExecutiveSummaryPanelProps {
  summary: ExecutiveSummary;
}

/**
 * EAP-8 Workstream 2 (Executive Dashboard) — every value here is a real
 * count `router.ts`'s `buildExecutiveSummary` computed server-side from a
 * real repository read, never a fabricated placeholder. `configured: false`
 * (organizations/identity not wired in this deployment) renders as "—" with
 * an explanatory hint, the same `MetricCard` idiom `DashboardPage.tsx`'s
 * own `overviewMetricProps` already established, rather than a zero that
 * would look identical to "really is zero".
 */
export function ExecutiveSummaryPanel({ summary }: ExecutiveSummaryPanelProps) {
  return (
    <div className="titan-executive-summary__metrics">
      <MetricCard
        label="Organizations"
        value={summary.organizations.configured ? summary.organizations.total : "—"}
        hint={summary.organizations.configured ? undefined : "Not configured"}
      />
      <MetricCard label="Leads" value={summary.leads.total} />
      <MetricCard label="Assessments" value={summary.assessments.total} />
      <MetricCard
        label="Platform Administrators"
        value={summary.identity.configured ? summary.identity.platformAdministrators : "—"}
        hint={summary.identity.configured ? undefined : "Not configured"}
      />
      <MetricCard
        label="Audit events (24h)"
        value={summary.audit.last24h}
        hint={`${summary.audit.total} total`}
      />
    </div>
  );
}

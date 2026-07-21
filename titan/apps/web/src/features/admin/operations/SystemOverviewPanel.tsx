import type { SystemOverview } from "@titan/platform";

export interface SystemOverviewPanelProps {
  overview: SystemOverview;
}

/**
 * EAP-7: Workstream 6 (System Overview) — every field here is real and
 * verified, not a placeholder for information this deployment doesn't
 * have. There is no CI-injected build hash/timestamp anywhere in this
 * codebase (`router.ts`'s own comment on `PLATFORM_VERSION`), so "build
 * information" isn't listed here rather than fabricated — see
 * `SECURITY_GUIDE.md`'s known-gaps entry for the honest account.
 */
export function SystemOverviewPanel({ overview }: SystemOverviewPanelProps) {
  return (
    <dl className="titan-operations-overview">
      <div>
        <dt>Platform version</dt>
        <dd>{overview.version}</dd>
      </div>
      <div>
        <dt>Runtime environment</dt>
        <dd>{overview.environment}</dd>
      </div>
      <div>
        <dt>Registered services</dt>
        <dd>{overview.modules.join(", ")}</dd>
      </div>
    </dl>
  );
}

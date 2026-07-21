import { Badge } from "@titan/design-system";

export interface FrameworkBadgeProps {
  framework: string;
  frameworkVersion: string;
}

/** EAP-3: framework + version as one compact badge — two real consumers
 * (the Assessment Workspace table, Assessment Details' metadata panel).
 * A neutral tone: unlike risk/status, a framework isn't itself
 * good/bad/urgent, so `RiskBadge`'s tone mapping doesn't apply here. */
export function FrameworkBadge({ framework, frameworkVersion }: FrameworkBadgeProps) {
  return (
    <Badge tone="neutral">
      {framework} v{frameworkVersion}
    </Badge>
  );
}

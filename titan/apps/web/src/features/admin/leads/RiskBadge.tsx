import type { RiskLevel } from "@titan/assessment-core";
import { Badge, type BadgeTone } from "@titan/design-system";

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  low: "success",
  medium: "warning",
  high: "warning",
  critical: "error",
};

export interface RiskBadgeProps {
  riskLevel: RiskLevel;
}

/** Same reasoning as StatusBadge — a domain mapping over `Badge`, kept out
 * of @titan/design-system so that package stays dependency-free
 * (RiskLevel comes from @titan/assessment-core here, LeadStatus from
 * @titan/platform for StatusBadge). */
export function RiskBadge({ riskLevel }: RiskBadgeProps) {
  return <Badge tone={RISK_TONES[riskLevel]}>{RISK_LABELS[riskLevel]}</Badge>;
}

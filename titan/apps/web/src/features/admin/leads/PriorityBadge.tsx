import type { LeadPriority } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_TONES: Record<LeadPriority, BadgeTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "error",
};

export interface PriorityBadgeProps {
  priority: LeadPriority;
}

/** Same pattern as StatusBadge/RiskBadge — not separately requested by
 * name, but priority is the third lifecycle badge the Lead Workspace table
 * and the Lifecycle panel both render, and treating it inconsistently
 * (one inline style for priority, real components for status/risk) would
 * be the odd one out rather than the consistent choice. */
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

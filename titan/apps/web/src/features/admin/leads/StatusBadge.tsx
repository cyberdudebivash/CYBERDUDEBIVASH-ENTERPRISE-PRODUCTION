import type { LeadStatus } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
};

const STATUS_TONES: Record<LeadStatus, BadgeTone> = {
  new: "info",
  contacted: "neutral",
  qualified: "success",
  disqualified: "error",
  converted: "success",
};

export interface StatusBadgeProps {
  status: LeadStatus;
}

/** The domain-aware half of Badge (@titan/design-system's tone/children
 * primitive) — lives here, not in the design system, because it has to
 * import LeadStatus from @titan/platform, and design-system is a
 * deliberate dependency-free leaf package (ARCHITECTURE.md's audit).
 * Real, closed status vocabulary — this is why NewLead's LeadStatus is a
 * union, not a free-text string. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

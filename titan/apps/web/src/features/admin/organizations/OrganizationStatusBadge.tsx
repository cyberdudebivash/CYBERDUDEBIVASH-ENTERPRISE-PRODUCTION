import type { OrganizationStatus } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Active",
  archived: "Archived",
};

const STATUS_TONES: Record<OrganizationStatus, BadgeTone> = {
  active: "success",
  archived: "neutral",
};

export interface OrganizationStatusBadgeProps {
  status: OrganizationStatus;
}

/** Same reasoning as `StatusBadge` (leads)/`FrameworkBadge` (assessments) —
 * a domain mapping over `Badge`, kept out of @titan/design-system so that
 * package stays dependency-free (`OrganizationStatus` comes from
 * @titan/platform). */
export function OrganizationStatusBadge({ status }: OrganizationStatusBadgeProps) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

import type { SupportRequestStatus } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const STATUS_LABELS: Record<SupportRequestStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

const STATUS_TONES: Record<SupportRequestStatus, BadgeTone> = {
  open: "info",
  resolved: "success",
};

/** Mirrors `leads/StatusBadge.tsx`'s own split for the same reason: it has
 * to import SupportRequestStatus from @titan/platform, and design-system
 * stays a dependency-free leaf package (ARCHITECTURE.md's audit). */
export function SupportRequestStatusBadge({ status }: { status: SupportRequestStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

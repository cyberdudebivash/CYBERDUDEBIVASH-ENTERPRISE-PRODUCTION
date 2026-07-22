import type { SubscriptionStatus } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  canceled: "Canceled",
  expired: "Expired",
};

const STATUS_TONES: Record<SubscriptionStatus, BadgeTone> = {
  trialing: "info",
  active: "success",
  canceled: "neutral",
  expired: "error",
};

export interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

/** COM-1: same domain-mapping-over-`Badge` pattern `RiskBadge`/
 * `FrameworkBadge` already established — kept out of `@titan/design-system`
 * for the identical leaf-package reason (`SubscriptionStatus` comes from
 * `@titan/platform`). Two real consumers: the Customer Portal's own
 * Subscription page and the admin Commercial Workspace/Detail pages. */
export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

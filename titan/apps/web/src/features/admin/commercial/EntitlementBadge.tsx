import { Badge } from "@titan/design-system";

export interface EntitlementBadgeProps {
  label: string;
  enabled: boolean;
}

/** COM-1: one entitlement's on/off state — real consumers on both the
 * Customer Portal's own Subscription page (this organization's own
 * entitlements) and the admin Commercial Workspace/Detail pages (a plan's
 * entitlements, and — when a real subscription's status has collapsed
 * them, `resolveEntitlements` — what's actually granted right now). */
export function EntitlementBadge({ label, enabled }: EntitlementBadgeProps) {
  return (
    <Badge tone={enabled ? "success" : "neutral"}>
      {enabled ? "✓" : "—"} {label}
    </Badge>
  );
}

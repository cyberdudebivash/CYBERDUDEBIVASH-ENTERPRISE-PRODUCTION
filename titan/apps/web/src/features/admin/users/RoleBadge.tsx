import type { UserRole } from "@titan/platform";
import { Badge, type BadgeTone } from "@titan/design-system";

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  owner: "warning",
  admin: "info",
  member: "neutral",
};

export interface RoleBadgeProps {
  /** Named `userRole`, not `role` — a plain `role` prop on a JSX element
   * reads, to both eslint-plugin-jsx-a11y's static `aria-role` check and a
   * future reader, as the DOM's own ARIA `role` attribute, which this isn't. */
  userRole: UserRole;
  /** A profile with `organizationId: null` and `userRole: "owner"` is a
   * Platform Administrator grant, not membership in any single organization
   * (`isPlatformAdministrator`, `@titan/platform`) — surfaced as its own
   * label so it isn't mistaken for an ordinary organization ownership role. */
  isPlatformAdministrator?: boolean;
}

/** Same reasoning as `OrganizationStatusBadge`/`FrameworkBadge` — a domain
 * mapping over `Badge`, kept out of `@titan/design-system` so that package
 * stays dependency-free (`UserRole` comes from `@titan/platform`). */
export function RoleBadge({ userRole, isPlatformAdministrator }: RoleBadgeProps) {
  if (isPlatformAdministrator) {
    return <Badge tone="warning">Platform Administrator</Badge>;
  }
  return <Badge tone={ROLE_TONES[userRole]}>{ROLE_LABELS[userRole]}</Badge>;
}

import type { SidebarItem } from "../../../components/Sidebar.js";
import type { MeResponse } from "../../admin/auth/session.js";

/** CPP-1: whether `me` has a real organization membership at all — the
 * same client-side mirror of `router.ts`'s `resolvePortalOrganizationId`
 * used to decide whether to even attempt the portal routes, not a security
 * boundary of its own (every `/api/portal/*` route re-derives and
 * re-checks this server-side regardless of what the client believes). */
export function hasPortalOrganizationMembership(me: MeResponse): boolean {
  return me.profiles.some((profile) => profile.organizationId !== null);
}

/**
 * The Customer Portal's own nav — a sibling to `adminNavItems`, not an
 * extension of it: a customer (an Organization Member/Admin/Owner) should
 * never see an admin-console nav item, and a Platform-Administrator-only
 * caller with no real organization membership has nothing to view here
 * (`hasPortalOrganizationMembership` above), so every entry is gated on
 * that check, hidden entirely rather than shown-then-blocked — the same
 * convention `adminNavItems` already established for its own gated items.
 */
export function portalNavItems(me: MeResponse): SidebarItem[] {
  if (!hasPortalOrganizationMembership(me)) return [];

  return [
    { label: "Dashboard", to: "/portal" },
    { label: "Assessments", to: "/portal/assessments" },
    { label: "Reports", to: "/portal/reports" },
    { label: "Support", to: "/portal/support" },
    { label: "Account", to: "/portal/account" },
  ];
}

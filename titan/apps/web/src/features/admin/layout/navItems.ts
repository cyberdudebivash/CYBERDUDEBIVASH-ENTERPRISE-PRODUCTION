import type { SidebarItem } from "../../../components/Sidebar.js";
import type { MeResponse } from "../auth/session.js";

/**
 * The single place that decides what a signed-in caller can navigate to in
 * the admin app, as a function of their real role — not a static list, and
 * not a per-page decision. Every future module (Leads, Assessments,
 * Organizations, Users, Audit, Operations) adds its own conditional entry
 * here as it's built, rather than every page independently deciding
 * whether to show itself in the nav.
 */
// `_me` (not `me`): part of this function's real contract (role-aware
// navigation) — no role-gated item exists yet to branch on, but the
// signature stays "a function of the caller's role" so adding one later is
// a change inside this function, not at every call site.
export function adminNavItems(_me: MeResponse): SidebarItem[] {
  return [{ label: "Dashboard", to: "/admin" }];
}

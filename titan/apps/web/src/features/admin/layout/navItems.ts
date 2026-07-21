import type { SidebarItem } from "../../../components/Sidebar.js";
import type { MeResponse } from "../auth/session.js";

/**
 * The single place that decides what a signed-in caller can navigate to in
 * the admin app, as a function of their real role — not a static list, and
 * not a per-page decision. Every future module (Assessments,
 * Organizations, Users, Audit, Operations) adds its own conditional entry
 * here as it's built, rather than every page independently deciding
 * whether to show itself in the nav.
 *
 * EAP-2: Leads is the first entry gated on the caller's real role, not
 * shown unconditionally — every route it links to (`GET /api/leads/search`
 * and friends) is Platform-Administrator-only (SECURITY_GUIDE.md), so
 * showing the link to a non-admin would just be a nav item that always
 * 403s. `me.isPlatformAdministrator` is the same server-computed flag
 * `useDashboardData`'s own gated sections already trust.
 */
export function adminNavItems(me: MeResponse): SidebarItem[] {
  return [
    { label: "Dashboard", to: "/admin" },
    ...(me.isPlatformAdministrator ? [{ label: "Leads", to: "/admin/leads" }] : []),
    // EAP-3: same gating reasoning as Leads above — every route it links to
    // (GET /api/assessments/search and friends) is Platform-Administrator-only
    // (SECURITY_GUIDE.md).
    ...(me.isPlatformAdministrator ? [{ label: "Assessments", to: "/admin/assessments" }] : []),
    // EAP-4: same gating reasoning as Leads/Assessments above — every route
    // it links to (GET /api/organizations/search and friends) is
    // Platform-Administrator-only (SECURITY_GUIDE.md).
    ...(me.isPlatformAdministrator ? [{ label: "Organizations", to: "/admin/organizations" }] : []),
    // EAP-5: same gating reasoning as every entry above — every route it
    // links to (GET /api/users/search and friends) is
    // Platform-Administrator-only (SECURITY_GUIDE.md).
    ...(me.isPlatformAdministrator ? [{ label: "Users", to: "/admin/users" }] : []),
  ];
}

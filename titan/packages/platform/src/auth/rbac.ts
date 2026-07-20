import type { UserProfileRecord, UserRole } from "../repositories/types.js";

/**
 * RBAC foundation (Workstream 5). Deliberately three flat roles, not a
 * permissions matrix — "foundation", not full enterprise RBAC, matching
 * the same scope line Workstream 5 draws around enterprise SSO.
 */
const ROLE_RANK: Record<UserRole, number> = { member: 0, admin: 1, owner: 2 };

export function hasAtLeastRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Organization awareness (Workstream 5): a user can belong to more than one
 * organization (user_profiles has one row per membership — migrations/0003),
 * so resolving "this user's role in this organization" means picking the
 * profile whose organizationId matches, not just taking the first one. */
export function findProfileForOrganization(
  profiles: UserProfileRecord[],
  organizationId: string,
): UserProfileRecord | null {
  return profiles.find((profile) => profile.organizationId === organizationId) ?? null;
}

export function canAccessOrganization(
  profiles: UserProfileRecord[],
  organizationId: string,
  minimumRole: UserRole = "member",
): boolean {
  const profile = findProfileForOrganization(profiles, organizationId);
  return profile !== null && hasAtLeastRole(profile.role, minimumRole);
}

/**
 * Platform Administrator (Security Release Blocker Sprint): a grant that
 * isn't scoped to any single organization — needed for routes like
 * `GET /api/leads` that read across every organization at once, where no
 * per-organization role is the right question to ask. Deliberately reuses
 * the existing `user_profiles` shape instead of a new role enum or a schema
 * change: a profile with `organizationId: null` has no organization to be
 * a member/admin/owner *of*, so that combination is otherwise unused, and
 * `role: "owner"` on it reads naturally as "owns the platform itself". The
 * table's `(user_id, organization_id)` unique index (migrations/0003)
 * already guarantees at most one such row per user.
 */
export function isPlatformAdministrator(profiles: UserProfileRecord[]): boolean {
  return profiles.some((profile) => profile.organizationId === null && profile.role === "owner");
}

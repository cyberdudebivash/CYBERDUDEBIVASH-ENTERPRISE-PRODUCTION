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

import type {
  AuditEventRecord,
  UserProfileRecord,
  UserRecord,
  UserRole,
  UserSearchOptions,
  UserSearchResult,
} from "@titan/platform";
import { deleteJson, getJson, patchJson, postJson } from "../../../lib/apiClient.js";

/** EAP-5: `@titan/web`'s side of the Enterprise User Directory's API surface
 * — same one-file-per-feature scope as `organizationApi.ts`. Read-only for
 * identity itself (there is no `updateUser`/`createUser` — see
 * `UserRecord`'s own doc comment, `@titan/platform`): every write here is a
 * `UserProfileRecord` (an organization/role grant), never the user's own
 * name/email. */

/** The shape `GET /api/users/:id` actually returns — identity composed with
 * this user's own grants (`router.ts`'s `getUser`), not just `UserRecord`. */
export type UserWithProfiles = UserRecord & { profiles: UserProfileRecord[] };

export function fetchUser(id: string): Promise<UserWithProfiles> {
  return getJson<UserWithProfiles>(`/api/users/${encodeURIComponent(id)}`);
}

export function searchUsers(options: UserSearchOptions): Promise<UserSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<UserSearchResult>(`/api/users/search${query ? `?${query}` : ""}`);
}

/** Role Assignment's grant action — `organizationId: null` is a
 * platform-wide grant (Platform Administrator when `role` is "owner"). */
export function grantUserProfile(
  userId: string,
  body: { organizationId: string | null; role: UserRole },
): Promise<UserProfileRecord> {
  return postJson<UserProfileRecord>(`/api/users/${encodeURIComponent(userId)}/profiles`, body);
}

/** Role Assignment's change-role action. */
export function updateUserProfile(
  userId: string,
  profileId: string,
  role: UserRole,
): Promise<UserProfileRecord> {
  return patchJson<UserProfileRecord>(
    `/api/users/${encodeURIComponent(userId)}/profiles/${encodeURIComponent(profileId)}`,
    { role },
  );
}

/** Role Assignment's revoke action — this application's one real deletion
 * (see `UserProfileRepository.remove`'s doc comment, `@titan/platform`). */
export function revokeUserProfile(userId: string, profileId: string): Promise<void> {
  return deleteJson(
    `/api/users/${encodeURIComponent(userId)}/profiles/${encodeURIComponent(profileId)}`,
  );
}

/** A single user's own activity/audit trail — server-filtered
 * (`GET /api/audit?entityType=user&entityId=...`), same reasoning as
 * `organizationApi.ts`'s `fetchOrganizationAuditTrail`. */
export function fetchUserAuditTrail(userId: string): Promise<AuditEventRecord[]> {
  const params = new URLSearchParams({ entityType: "user", entityId: userId });
  return getJson<AuditEventRecord[]>(`/api/audit?${params}`);
}

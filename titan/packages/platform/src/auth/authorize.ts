import type { UserProfileRecord, UserRole } from "../repositories/types.js";
import { jsonError } from "../http/responses.js";
import { canAccessOrganization, isPlatformAdministrator } from "./rbac.js";

/**
 * The authorization-gate pattern for any protected route (RC1 Workstream 9,
 * wired for real by the Security Release Blocker Sprint). A route handler
 * resolves the caller's UserProfileRecord[] (router.ts's `resolveCaller`,
 * a repository lookup keyed by the authenticated session's user id) and
 * calls a gate like this before doing anything the role should govern.
 * Returns `null` to mean "proceed" and a ready-to-return `Response` to mean
 * "stop here" — the same short-circuit shape router.ts's own
 * `isTrustedOrigin`/`checkRateLimit` checks already use.
 */
export function requireOrganizationAccess(
  profiles: UserProfileRecord[],
  organizationId: string,
  minimumRole: UserRole,
  requestId: string,
): Response | null {
  if (!canAccessOrganization(profiles, organizationId, minimumRole)) {
    return jsonError(
      { code: "forbidden", message: "Insufficient role for this organization" },
      requestId,
      403,
    );
  }
  return null;
}

/**
 * Gate shared by every route that reads *across* every organization at once
 * rather than one organization's own data — `GET /api/leads`,
 * `GET /api/organizations`, `GET /api/assessments` (list),
 * `GET /api/audit` (EAP-1). None of those repositories filter by
 * organization (`SECURITY_GUIDE.md`'s tenant-isolation review), so gating
 * any of them at "any organization member" would itself be a cross-tenant
 * leak: a member of one organization would see every other organization's
 * data too, just behind what looks like a real check. Until a repository
 * supports organization-scoped filtering, a global, cross-organization read
 * may only be performed by a Platform Administrator.
 */
export function requirePlatformAdministrator(
  profiles: UserProfileRecord[],
  requestId: string,
): Response | null {
  if (!isPlatformAdministrator(profiles)) {
    return jsonError(
      { code: "forbidden", message: "Platform Administrator role required" },
      requestId,
      403,
    );
  }
  return null;
}

/** Gate for `GET /api/leads` specifically — see `requirePlatformAdministrator`
 * for why this is the right policy for a cross-organization list. Kept as
 * its own named export (rather than every call site calling
 * `requirePlatformAdministrator` directly) since `SECURITY_GUIDE.md` and
 * existing tests already reference it as the leads route's own policy. */
export function requireLeadsAccess(
  profiles: UserProfileRecord[],
  requestId: string,
): Response | null {
  return requirePlatformAdministrator(profiles, requestId);
}

/**
 * Gate for `GET /api/assessments/:id`. Unlike leads, a single assessment
 * belongs to at most one organization, so this can be scoped correctly: a
 * Platform Administrator may read any assessment, and an organization
 * member (or higher) may read their own organization's. An assessment
 * created with no `organizationId` (possible today — `POST /api/assessments`
 * accepts an optional, not required, `organizationId`) has no membership to
 * check against, so only a Platform Administrator can read it.
 */
export function requireAssessmentAccess(
  profiles: UserProfileRecord[],
  assessmentOrganizationId: string | null,
  requestId: string,
): Response | null {
  if (isPlatformAdministrator(profiles)) return null;
  if (assessmentOrganizationId && canAccessOrganization(profiles, assessmentOrganizationId)) {
    return null;
  }
  return jsonError(
    { code: "forbidden", message: "Insufficient access to this assessment" },
    requestId,
    403,
  );
}

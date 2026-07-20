import type { UserProfileRecord, UserRole } from "../repositories/types.js";
import { jsonError } from "../http/responses.js";
import { canAccessOrganization } from "./rbac.js";

/**
 * The authorization-gate pattern for any future protected route (RC1
 * Workstream 9). No route in this codebase is protected yet — there is no
 * Admin/Customer Portal to protect (SECURITY_GUIDE.md's ASVS review notes
 * this as "not applicable yet", not "done"). This exists so the day a real
 * protected route is added, it calls this rather than a bespoke check
 * invented at that call site.
 *
 * A route handler resolves the caller's UserProfileRecord[] however it
 * does that (a repository lookup keyed by the authenticated user's id —
 * genuinely future work, not stubbed here) and calls this before doing
 * anything the role should gate. Returns `null` to mean "proceed" and a
 * ready-to-return `Response` to mean "stop here" — the same short-circuit
 * shape router.ts's own `isTrustedOrigin`/`checkRateLimit` checks already
 * use, so wiring this into a real route reads the same way the existing
 * ones do.
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

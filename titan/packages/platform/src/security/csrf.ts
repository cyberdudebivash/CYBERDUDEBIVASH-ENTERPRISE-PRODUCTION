/**
 * CSRF protection for the custom JSON endpoints (Workstream 7's remaining
 * technical debt, closed here). Auth.js's own `/api/auth/*` actions already
 * carry their own CSRF handling (a double-submit cookie token) — this only
 * covers this package's own write endpoints, which don't inherit that.
 *
 * Originally written for `POST /api/leads`/`POST /api/assessments`, both
 * unauthenticated and cookie-free — a classic form-based CSRF attack needs
 * the browser to auto-attach a cookie, which didn't apply there; the actual
 * risk it closed was a same-origin-looking browser request forged from a
 * different site. `PATCH /api/leads/:id` (EAP-2) reuses the same check for
 * a materially different reason: it *is* a cookie-authenticated route, and
 * a forged cross-origin request there would ride along with the caller's
 * real session cookie — Origin validation is more load-bearing here, not
 * less, since there's a real privileged action to forge.
 *
 * A request with no Origin header is allowed through — same-origin requests
 * from older browsers and any non-browser caller (curl, server-to-server)
 * legitimately omit it, and CSRF is a browser-specific attack class by
 * definition.
 */
export function isTrustedOrigin(request: Request, allowedOrigin: string): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  return origin === allowedOrigin;
}

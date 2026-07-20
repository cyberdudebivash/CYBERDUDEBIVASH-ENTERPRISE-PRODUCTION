/**
 * CSRF protection for the custom JSON endpoints (Workstream 7's remaining
 * technical debt, closed here). Auth.js's own `/api/auth/*` actions already
 * carry their own CSRF handling (a double-submit cookie token) — this only
 * covers `POST /api/leads`/`POST /api/assessments`, which don't inherit
 * that.
 *
 * Origin-header validation, not a CSRF token, because these are unauthenticated,
 * cookie-free JSON endpoints (no session to ride along on) — a classic
 * form-based CSRF attack needs the browser to auto-attach a cookie, which
 * doesn't apply here. The actual risk this closes is a same-origin-looking
 * browser request forged from a different site; the Origin header is set by
 * the browser itself and can't be spoofed by page content.
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

import { corsHeaders } from "./cors.js";

/**
 * Strict default for every JSON API response (health, leads, assessments) —
 * this Worker never renders HTML on those routes, so there's no reason to
 * allow any resource type at all.
 *
 * SEC-1: `frame-ancestors` is listed explicitly, not left to `default-src`.
 * Per the CSP3 spec, `frame-ancestors` is one of the few directives that does
 * NOT fall back to `default-src` — `default-src 'none'` alone restricts
 * zero framing. Clickjacking protection on every route was, until this
 * addition, coming exclusively from the legacy `X-Frame-Options: DENY`
 * header (still kept below, as defense in depth for the handful of older
 * user agents that honor X-Frame-Options but not this CSP directive).
 */
export const STRICT_CSP = "default-src 'none'; frame-ancestors 'none'";

/**
 * Auth.js's own /api/auth/* actions (e.g. GET /api/auth/signin without a
 * custom `pages` config) render real HTML with inline <style> tags —
 * verified directly against a real `Auth()` call, not assumed. The strict
 * `default-src 'none'` policy above would silently break that page's
 * styling (though not its function — it has no inline <script>, confirmed
 * the same way). `style-src 'unsafe-inline'` is scoped to *style* only,
 * not script — inline styles can't execute code, so this is a materially
 * smaller risk than allowing inline scripts, and `script-src 'self'` stays
 * strict (blocks any injected inline script even on this route).
 *
 * Nonce support: genuinely not wired into this policy. Auth.js's built-in
 * pages are rendered internally (via `preact-render-to-string`) and don't
 * expose a way to inject a per-request nonce attribute into their own
 * markup — claiming nonce-based CSP here would be fabricating a control
 * that isn't actually enforced. The honest state: this route uses a scoped
 * `style-src 'unsafe-inline'` allowance, not a nonce, until either Auth.js
 * exposes a nonce hook for its built-in pages or this project replaces them
 * with custom-rendered sign-in pages this codebase controls directly.
 *
 * `form-action` takes `allowedOrigin` too (EAP-1), not just `'self'` — a
 * real finding from real-browser verification, not something a unit test
 * or curl could have caught: the CSP spec's `form-action` directive also
 * restricts *redirects resulting from* a form submission, not just its
 * immediate POST target. Auth.js's real sign-out confirmation page POSTs
 * back to its own origin (satisfying a bare `'self'`) but then 302s to
 * `callbackUrl` — the cross-origin admin SPA — and Chromium correctly
 * refused to submit a form it could determine would redirect outside
 * `form-action`'s allowed origins, aborting the POST entirely (verified via
 * an isolated repro: the exact same form submits successfully with no
 * `callbackUrl`, and fails only once one pointing off-origin is present).
 * The same trust decision as `auth/config.ts`'s `redirect` callback: this
 * one additional, known origin is allowed, nothing else is.
 */
export function authPagesCsp(allowedOrigin: string): string {
  return `default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self' ${allowedOrigin}; frame-ancestors 'none'`;
}

const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Ignored by browsers over plain http (spec requirement), so this is
  // inert for local `wrangler dev` today and takes effect automatically
  // the day this is ever served over real HTTPS.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  // Deliberately "cross-origin", not "same-origin": this API is designed to
  // be called from a different origin (titan/apps/web's own dev server, a
  // different port than `wrangler dev` — cors.ts), so opting into the
  // stricter CORP value would fight the CORS configuration this Worker
  // actually needs, not add real protection for an API meant to be public.
  "Cross-Origin-Resource-Policy": "cross-origin",
};

/**
 * The single place every response — success, error, or Auth.js's own
 * (Workstream 5's /api/auth/* passthrough) — gets security headers, CORS,
 * and the request id attached. Centralizing this means a route can't
 * "forget" to apply it the way per-route header logic could.
 */
export function finalizeResponse(
  response: Response,
  requestId: string,
  allowedOrigin: string,
  contentSecurityPolicy: string = STRICT_CSP,
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
    headers.set(key, value);
  }
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, { status: response.status, headers });
}

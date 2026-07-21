/**
 * CORS (Workstream 4/7). This Worker has never been deployed, so there is
 * no real production origin to allow yet — this exists so titan/apps/web's
 * local Vite dev server (a different origin/port than `wrangler dev`) can
 * actually call it during local development, which Workstream 4's frontend
 * migration needs to work at all. Defaults to Vite's default dev port;
 * override via the ALLOWED_ORIGIN Worker var (wrangler.toml) once a real
 * frontend origin exists.
 */
const DEFAULT_ALLOWED_ORIGIN = "http://localhost:5173";

// EAP-2: PATCH added for /api/leads/:id (the Lead Lifecycle panel's real
// write). A real, non-hypothetical gap this exact change exposed — a
// cross-origin PATCH's browser-issued preflight OPTIONS request checks the
// *response's* Access-Control-Allow-Methods against the actual method it's
// about to send, and rejects the real request client-side (before it ever
// reaches this Worker) if the method it wants isn't listed, regardless of
// whether the route itself would have allowed it. Found by real-browser
// verification, not a unit test — jsdom's fetch mock in this codebase's
// component tests doesn't enforce real CORS preflight semantics at all.
// EAP-5: DELETE added for /api/users/:id/profiles/:profileId (Role
// Assignment's revoke action) — added proactively in the same change that
// introduces the method, precisely because EAP-2's own PATCH omission above
// was only ever found after shipping. Verified by real-browser E2E, not
// assumed safe from this comment alone.
const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, X-Request-Id";
// EAP-6: `Content-Disposition` isn't one of the CORS-safelisted response
// headers a cross-origin `fetch()` exposes to JS by default — without this,
// `response.headers.get("content-disposition")` silently returns null for
// every real browser request (`apiClient.ts`'s `getBlob`), even though a
// same-process router test or curl sees the header just fine. Found by real
// Playwright/Chromium E2E verification (`audit-center.spec.ts`), not a unit
// test — the exact same class of gap EAP-2's missing
// Access-Control-Allow-Methods entry was (see that comment above): a real
// cross-origin browser behavior no jsdom-mocked-fetch component test
// exercises.
const EXPOSED_HEADERS = "Content-Disposition";

export function resolveAllowedOrigin(configuredOrigin: string | undefined): string {
  return configuredOrigin ?? DEFAULT_ALLOWED_ORIGIN;
}

export function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Expose-Headers": EXPOSED_HEADERS,
    // EAP-1: the admin app reads the Auth.js session cookie cross-origin
    // (fetch(..., {credentials: "include"})). The Fetch spec requires this
    // exact header for a browser to expose a credentialed cross-origin
    // response to JS at all — and forbids Access-Control-Allow-Origin from
    // ever being "*" alongside it, which `allowedOrigin` already isn't
    // (resolveAllowedOrigin always returns one concrete origin).
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function preflightResponse(allowedOrigin: string): Response {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(allowedOrigin), "Access-Control-Max-Age": "86400" },
  });
}

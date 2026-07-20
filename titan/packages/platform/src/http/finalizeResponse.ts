import { corsHeaders } from "./cors.js";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No inline-script/style allowance: this Worker only ever returns JSON or
  // Auth.js's own redirect/HTML sign-in pages, so a strict default-src
  // costs nothing normally and forecloses response-splitting/XSS risk if a
  // future route ever changes that (OWASP alignment — Workstream 7).
  "Content-Security-Policy": "default-src 'none'",
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
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
    headers.set(key, value);
  }
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, { status: response.status, headers });
}

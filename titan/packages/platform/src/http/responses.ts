/**
 * Centralized response construction (Workstream 7/8). Every response the
 * Worker returns — success or error — goes through one of these two
 * functions, so security headers and the request id land on every response
 * exactly once, in one place, instead of being repeated (or forgotten) at
 * each route handler.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No inline-script/style allowance: this Worker only ever returns JSON,
  // never HTML, so a strict CSP costs nothing and forecloses an entire
  // class of response-splitting/XSS risk if a future route ever changes
  // that (OWASP alignment — Workstream 7).
  "Content-Security-Policy": "default-src 'none'",
};

function withHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, { status: response.status, headers });
}

export function jsonSuccess(data: unknown, requestId: string, status = 200): Response {
  return withHeaders(Response.json(data, { status }), requestId);
}

export interface ApiError {
  code: string;
  message: string;
}

/**
 * Every error response carries the same envelope shape
 * (`{ error: { code, message }, requestId }`) regardless of which route or
 * validation rule produced it — a client can rely on that shape everywhere
 * instead of every endpoint inventing its own error format. requestId in the
 * body (not just the header) so it survives being copy-pasted into a bug
 * report or support ticket.
 */
export function jsonError(error: ApiError, requestId: string, status: number): Response {
  return withHeaders(Response.json({ error, requestId }, { status }), requestId);
}

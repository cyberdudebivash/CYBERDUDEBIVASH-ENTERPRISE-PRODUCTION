/**
 * Response body shaping (Workstream 7/8). These build the JSON body and
 * status only — security headers, CORS, and the request id are applied
 * once, centrally, in router.ts's handleRequest (finalizeResponse.js), so
 * routes that don't go through these two helpers (Auth.js's own responses,
 * once Workstream 5 wires /api/auth/* through) still get the same headers
 * instead of every route needing to remember to apply them.
 */
export function jsonSuccess(data: unknown, status = 200): Response {
  return Response.json(data, { status });
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
  return Response.json({ error, requestId }, { status });
}

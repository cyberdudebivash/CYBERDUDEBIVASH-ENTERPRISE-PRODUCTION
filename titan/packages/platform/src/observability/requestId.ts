/**
 * Request correlation (Workstream 8). Reuses an inbound X-Request-Id when a
 * caller (or an upstream Cloudflare-side proxy) already set one, so a single
 * logical request keeps one id across hops instead of getting a new one at
 * every layer; otherwise mints one so every request is correlatable even
 * when nothing upstream sent an id.
 */
export function resolveRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

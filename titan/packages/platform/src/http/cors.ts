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

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, X-Request-Id";

export function resolveAllowedOrigin(configuredOrigin: string | undefined): string {
  return configuredOrigin ?? DEFAULT_ALLOWED_ORIGIN;
}

export function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  };
}

export function preflightResponse(allowedOrigin: string): Response {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(allowedOrigin), "Access-Control-Max-Age": "86400" },
  });
}

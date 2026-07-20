import { Auth, type AuthConfig } from "@auth/core";
import type { Session } from "@auth/core/types";

/**
 * @auth/core has no framework-agnostic "getSession(cookies)" helper the way
 * next-auth's Next.js integration does — this project isn't Next.js. This
 * is the same thing done at the framework-integration level: build a
 * Request to Auth.js's own /session action and let Auth() do the real
 * cookie/JWT/adapter work, rather than re-implementing session parsing.
 */
export async function getSession(request: Request, config: AuthConfig): Promise<Session | null> {
  const basePath = config.basePath ?? "/api/auth";
  const sessionUrl = new URL(`${basePath}/session`, new URL(request.url).origin);
  const sessionRequest = new Request(sessionUrl, { headers: request.headers });

  const response = await Auth(sessionRequest, config);
  if (!response.ok) return null;

  // Auth.js's /session action returns JSON `null` (not `{}`) when there is
  // no active session — verified against a real Auth() call, not assumed.
  const body = (await response.json()) as Record<string, unknown> | null;
  return body && Object.keys(body).length > 0 ? (body as unknown as Session) : null;
}

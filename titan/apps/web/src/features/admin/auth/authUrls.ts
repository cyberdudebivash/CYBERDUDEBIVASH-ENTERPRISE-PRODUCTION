import { apiBaseUrl } from "../../../lib/apiClient.js";

/**
 * Links to Auth.js's own hosted pages (real HTML, real forms, real CSRF
 * handling — `router.ts` mounts `/api/auth/*` straight through to `Auth()`)
 * rather than a custom sign-in/out form in this app. `auth/config.ts`'s
 * `redirect` callback is what makes the round trip back to this app (a
 * different origin than the Worker) work at all — see its own comment for
 * why the default callback alone can't do this.
 */

function absoluteCallbackUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export function signInUrl(callbackPath: string): string {
  const params = new URLSearchParams({ callbackUrl: absoluteCallbackUrl(callbackPath) });
  return `${apiBaseUrl()}/api/auth/signin?${params}`;
}

export function signOutUrl(callbackPath = "/"): string {
  const params = new URLSearchParams({ callbackUrl: absoluteCallbackUrl(callbackPath) });
  return `${apiBaseUrl()}/api/auth/signout?${params}`;
}

/**
 * The one place titan/apps/web talks to the Cloudflare Worker
 * (titan/packages/platform). Workstream 4's whole point is that
 * dpdp-assessment's browser-only persistence goes away in favor of this —
 * so every fetch call in the app should go through here, not be
 * hand-rolled per feature.
 */
const DEFAULT_BASE_URL = "http://localhost:8787";

/** Exported for EAP-1's admin auth URLs (sign-in/sign-out link directly to
 * Auth.js's own hosted pages on the Worker's origin) — one resolution of
 * "where's the Worker", not a second copy of this logic. */
export function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ErrorEnvelope {
  error?: { message?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      // EAP-1: the admin app's session lives in a cookie the Worker sets on
      // a different origin (apiBaseUrl() vs. this app's own origin) — the
      // Fetch spec only sends/exposes cross-origin cookies when a request
      // opts in explicitly. Every existing caller of postJson/getJson (the
      // public, unauthenticated DPDP lead flow) is unaffected: an anonymous
      // request has no cookie to send either way.
      credentials: "include",
    });
  } catch {
    // fetch itself throwing means the network request never completed
    // (server unreachable, DNS failure, CORS rejection) — distinct from a
    // request that reached the server and got an error response.
    throw new ApiError("Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(
      body?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/** EAP-2: the admin app's first write past creation (`PATCH /api/leads/:id`)
 * — a real, authenticated update, unlike postJson's public, anonymous
 * writes. Shares the same `request` helper (credentials, error handling),
 * so it inherits the cross-origin cookie behavior for free. */
export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

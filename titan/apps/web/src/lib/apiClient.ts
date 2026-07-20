/**
 * The one place titan/apps/web talks to the Cloudflare Worker
 * (titan/packages/platform). Workstream 4's whole point is that
 * dpdp-assessment's browser-only persistence goes away in favor of this —
 * so every fetch call in the app should go through here, not be
 * hand-rolled per feature.
 */
const DEFAULT_BASE_URL = "http://localhost:8787";

function apiBaseUrl(): string {
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

export function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

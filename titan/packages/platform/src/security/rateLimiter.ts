/**
 * Rate-limiting hook (Workstream 7). This is a real, working fixed-window
 * limiter — not a stub — but it is explicitly scoped as a *hook*, not a
 * production control: it holds its counters in the Worker isolate's own
 * memory, so it only limits requests landing on that one isolate. A
 * Cloudflare deployment runs many isolates concurrently across colos with no
 * shared memory between them, so this cannot enforce a real global limit in
 * production. The router wires this interface in so swapping in Cloudflare's
 * native Rate Limiting binding (or a Durable Object) later is a new
 * implementation of RateLimiter, not a router rewrite — the same reason
 * every other cross-cutting concern here goes through an interface.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

export function createInMemoryRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, { count: number; windowStart: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const existing = windows.get(key);

      if (!existing || now - existing.windowStart >= options.windowMs) {
        windows.set(key, { count: 1, windowStart: now });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (existing.count < options.limit) {
        existing.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }

      const retryAfterSeconds = Math.ceil((existing.windowStart + options.windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    },
  };
}

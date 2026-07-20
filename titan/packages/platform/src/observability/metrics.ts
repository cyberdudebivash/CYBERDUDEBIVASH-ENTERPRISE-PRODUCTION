/**
 * Basic metrics hook (Workstream 8). Cloudflare Workers has no built-in
 * counter/histogram API reachable from application code the way a
 * StatsD/Prometheus client would be on a traditional host — real metrics
 * need Workers Analytics Engine (a binding this environment has never had
 * credentials for, same as everything else in DECISION_LOG.md). This
 * interface exists so the router can record counts/durations now, and
 * swapping the in-memory recorder for an Analytics Engine-backed one later
 * is a new implementation of Metrics, not a router rewrite.
 */
export interface Metrics {
  increment(name: string, tags?: Record<string, string>): void;
  recordDuration(name: string, durationMs: number, tags?: Record<string, string>): void;
}

interface RecordedCount {
  name: string;
  tags: Record<string, string>;
  count: number;
}

interface RecordedDuration {
  name: string;
  tags: Record<string, string>;
  durations: number[];
}

/** In-memory only — scoped to one Worker isolate, same limitation
 * security/rateLimiter.ts documents for the same reason. Good enough for
 * local dev/tests; not a production metrics backend. */
export function createInMemoryMetrics(): Metrics & {
  getCounts(): RecordedCount[];
  getDurations(): RecordedDuration[];
} {
  const counts = new Map<string, RecordedCount>();
  const durations = new Map<string, RecordedDuration>();

  function key(name: string, tags: Record<string, string>): string {
    return `${name}:${JSON.stringify(tags)}`;
  }

  return {
    increment(name, tags = {}) {
      const k = key(name, tags);
      const existing = counts.get(k);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(k, { name, tags, count: 1 });
      }
    },
    recordDuration(name, durationMs, tags = {}) {
      const k = key(name, tags);
      const existing = durations.get(k);
      if (existing) {
        existing.durations.push(durationMs);
      } else {
        durations.set(k, { name, tags, durations: [durationMs] });
      }
    },
    getCounts: () => [...counts.values()],
    getDurations: () => [...durations.values()],
  };
}

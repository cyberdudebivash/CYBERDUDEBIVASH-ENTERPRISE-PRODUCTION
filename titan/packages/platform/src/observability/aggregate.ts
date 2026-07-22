/**
 * OPS-1 (Workstream 2). `Metrics.getCounts()`/`getDurations()` (EAP-7) return
 * raw, per-tag-combination records — nothing anywhere computed a percentile
 * or an error rate from them (confirmed by repo-wide search before writing
 * this). These are the pure aggregation functions `operationsSummary` needs
 * to report real p50/p95/p99 latency and a real 4xx/5xx rate, and that
 * `alerts.ts` needs to evaluate thresholds against. Pure and synchronous —
 * no I/O, so trivially unit-testable with fixed inputs and exact expected
 * outputs, the same reasoning `config/validateEnv.ts` already established.
 */
import type { RecordedCount, RecordedDuration } from "./metrics.js";

export interface LatencyPercentiles {
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

const EMPTY_PERCENTILES: LatencyPercentiles = { count: 0, p50: 0, p95: 0, p99: 0 };

/** Nearest-rank method: the smallest value at or beyond the given
 * percentile's rank in the sorted sample — standard, deterministic, and
 * exact for small samples (no interpolation to explain in a doc). */
function percentileOf(sorted: number[], percentile: number): number {
  const rank = Math.ceil((percentile / 100) * sorted.length) - 1;
  // Always in bounds: rank is clamped to [0, sorted.length - 1] and this is
  // only ever called with a non-empty array — the `?? 0` fallback exists
  // only to satisfy noUncheckedIndexedAccess, not because it's reachable.
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))] ?? 0;
}

export function computeLatencyPercentiles(durations: number[]): LatencyPercentiles {
  if (durations.length === 0) {
    return EMPTY_PERCENTILES;
  }
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentileOf(sorted, 50),
    p95: percentileOf(sorted, 95),
    p99: percentileOf(sorted, 99),
  };
}

/** Flattens every `RecordedDuration` entry matching `name` (there is one
 * entry per distinct tag combination — e.g. one per method/path/status for
 * `http.request.duration_ms` — into a single sample for percentile
 * computation across all of them combined. */
export function collectDurations(entries: RecordedDuration[], name: string): number[] {
  return entries.filter((entry) => entry.name === name).flatMap((entry) => entry.durations);
}

export interface ErrorRateSummary {
  total: number;
  serverErrors: number;
  clientErrors: number;
  /** 0..1, not a percentage string — the caller formats for display. */
  serverErrorRate: number;
  clientErrorRate: number;
}

const EMPTY_ERROR_RATE: ErrorRateSummary = {
  total: 0,
  serverErrors: 0,
  clientErrors: 0,
  serverErrorRate: 0,
  clientErrorRate: 0,
};

/** Reads `RecordedCount` entries whose `name` matches (default
 * `"http.request"`, the only counter this codebase increments today —
 * confirmed by repo-wide search) and whose `tags.status` is a numeric HTTP
 * status, summing into a real 4xx/5xx rate. Entries with a non-numeric or
 * absent `status` tag are counted toward `total` but not either error
 * bucket — same "don't fabricate a classification" reasoning as
 * `ServiceStatus.error` only ever reporting a real caught message. */
export function computeErrorRate(counts: RecordedCount[], name = "http.request"): ErrorRateSummary {
  const relevant = counts.filter((entry) => entry.name === name);
  if (relevant.length === 0) {
    return EMPTY_ERROR_RATE;
  }

  let total = 0;
  let serverErrors = 0;
  let clientErrors = 0;
  for (const entry of relevant) {
    total += entry.count;
    const status = Number(entry.tags.status);
    if (!Number.isFinite(status)) continue;
    if (status >= 500) serverErrors += entry.count;
    else if (status >= 400) clientErrors += entry.count;
  }

  return {
    total,
    serverErrors,
    clientErrors,
    serverErrorRate: total > 0 ? serverErrors / total : 0,
    clientErrorRate: total > 0 ? clientErrors / total : 0,
  };
}

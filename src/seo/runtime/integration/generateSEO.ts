import { runPipeline } from "../pipeline/runPipeline";
import { createMemoryCacheProvider } from "../cache/memoryCacheProvider";
import type { SEORuntimeCacheProvider } from "../cache/types";
import type { SEORuntimeResult, SEORuntimeOptions } from "../contracts/types";

// generateSEO — the Runtime Contract's single public API (see
// documentation/PUBLIC_API.md). Composes the pipeline (pipeline/) with
// the cache (cache/): a cache hit returns the prior SEORuntimeResult
// without re-running a single engine; a miss runs the full
// Configuration -> ... -> Diagnostics pipeline once and caches the
// result before returning it. A thrown SEORuntimeError is never
// cached — only a successful result reaches `runtimeCache.set`, so a
// transient failure (e.g. a temporarily-broken config edit) does not
// poison the cache for subsequent calls once the underlying issue is
// fixed.
//
// `runtimeCache` is this module's one instance of the cache/ factory —
// not a bare mutable global. Every read/write goes through the
// provider's own get/set/has methods (cache/types.ts); nothing outside
// this file ever touches the Map createMemoryCacheProvider() closes
// over. See documentation/CACHE_STRATEGY.md.

const runtimeCache: SEORuntimeCacheProvider<SEORuntimeResult> = createMemoryCacheProvider<SEORuntimeResult>();

export function generateSEO(pageId: string, options: SEORuntimeOptions = {}): SEORuntimeResult {
  if (!options.skipCache) {
    const cached = runtimeCache.get(pageId);
    if (cached) return cached;
  }

  const result = runPipeline(pageId);

  if (!options.skipCache) {
    runtimeCache.set(pageId, result);
  }

  return result;
}

/** Clears the Runtime's shared result cache. For tests (isolating one test's cached results from the next) and for a future admin/CLI cache-invalidation action — not part of the Runtime Contract's own public surface (generateSEO/checkRuntimeHealth). */
export function clearRuntimeCache(): void {
  runtimeCache.clear();
}

/** The number of pages currently cached — a cheap health/debugging signal, never used by the pipeline itself. */
export function getRuntimeCacheSize(): number {
  return runtimeCache.size;
}

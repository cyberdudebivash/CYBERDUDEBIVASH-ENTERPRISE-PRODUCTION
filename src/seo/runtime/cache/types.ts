import type { RelationshipGraph } from "../../relationships";
import type { SEOValidationReport } from "../../reports";
import type { SEORuntimeResult } from "../contracts/types";

// Owns: the cache abstraction's own shapes. "Support Metadata, Schema,
// Relationships, Commercial, Diagnostics" (this phase's own CACHE
// section) is satisfied by caching one page's full SEORuntimeResult —
// which already carries all five — keyed by pageId, plus the shared
// relationship graph and configuration report every page's pipeline
// run needs but none of them owns individually.

/** One page's cached pipeline output. Deliberately just the final SEORuntimeResult rather than five separate per-stage entries: every stage before Diagnostics is pure given (page, graph, configReport), so caching the assembled result is equivalent to caching each stage and considerably simpler. */
export interface RuntimeCacheEntry {
  result: SEORuntimeResult;
}

/**
 * A cache provider abstraction — "Memory implementation only" today
 * (cache/memoryCache.ts's MemoryCacheProvider), but any future
 * provider (Redis, filesystem, edge KV, ...) implements this same
 * interface. Every method is pure: read methods never inspect or
 * mutate `cache` beyond returning a value from it, write methods
 * return a BRAND NEW `TCache` rather than mutating the one they were
 * given. That is what makes "Deterministic / Immutable / No global
 * mutable state" a property of the type signatures themselves, not
 * just a convention an implementer has to remember.
 */
export interface RuntimeCacheProvider<TCache> {
  create(): TCache;
  readPage(cache: TCache, pageId: string): Readonly<RuntimeCacheEntry> | undefined;
  writePage(cache: TCache, pageId: string, entry: Readonly<RuntimeCacheEntry>): TCache;
  readGraph(cache: TCache): RelationshipGraph | undefined;
  writeGraph(cache: TCache, graph: RelationshipGraph): TCache;
  readConfigurationReport(cache: TCache): SEOValidationReport | undefined;
  writeConfigurationReport(cache: TCache, report: SEOValidationReport): TCache;
}

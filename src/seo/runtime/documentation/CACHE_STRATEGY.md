# Cache Strategy

`cache/` is an immutable, provider-based cache abstraction with one
Memory implementation, per this phase's own "Memory implementation
only" instruction.

## Why immutable

The task's CACHE section requires: "Deterministic. Immutable. No
global mutable state. Future cache providers supported." Every method
on `RuntimeCacheProvider<TCache>` is written so those four properties
are enforced by the type signatures themselves, not left as a
convention an implementer has to remember:

```ts
interface RuntimeCacheProvider<TCache> {
  create(): TCache;
  readPage(cache: TCache, pageId: string): Readonly<RuntimeCacheEntry> | undefined;
  writePage(cache: TCache, pageId: string, entry: Readonly<RuntimeCacheEntry>): TCache;
  readGraph(cache: TCache): RelationshipGraph | undefined;
  writeGraph(cache: TCache, graph: RelationshipGraph): TCache;
  readConfigurationReport(cache: TCache): SEOValidationReport | undefined;
  writeConfigurationReport(cache: TCache, report: SEOValidationReport): TCache;
}
```

Every `read*` method takes a `cache` and returns a value — it cannot
mutate what it's given. Every `write*` method takes a `cache` and
returns a **new** `TCache` — verified directly by
`tests/memoryCache.test.ts`, which writes to a cache and then asserts
the original, pre-write cache is still empty.

## `MemoryCacheProvider` (`cache/memoryCache.ts`)

```ts
interface MemoryRuntimeCache {
  readonly pages: ReadonlyMap<string, Readonly<RuntimeCacheEntry>>;
  readonly graph: RelationshipGraph | undefined;
  readonly configurationReport: SEOValidationReport | undefined;
}
```

`create()` returns a single frozen `EMPTY_CACHE` constant — since it's
never mutated (only ever read as the starting value passed back to a
caller), returning the same reference on every call is safe and
matches "no global mutable state": the constant itself is not state
that changes, it's a fixed starting point. Every `write*` method
returns `{ ...cache, ... }` — a new object — never touches the one it
was given.

## Why "no mutable globals" doesn't mean "no state at all"

`generateSEO(pageId)` (the literal public contract) takes no cache
parameter and is fully stateless — every call rebuilds everything from
scratch. `createSEORuntime()` is the opt-in cached path: it holds a
`let cache = provider.create()` in a closure private to the single
object it returns. This is **not** a module-level global — two
independent `createSEORuntime()` calls each get their own closure and
never share or leak state into one another (verified by
`tests/runtime.test.ts`'s "two independent runtimes never share cache
state" test). Every reassignment of that closure variable happens via
`provider.write*()`, which returns a new immutable value rather than
mutating the previous one — the closure variable is swapped, never the
cache object itself changed in place.

## Caching granularity

One page's full `SEORuntimeResult` is cached as a single
`RuntimeCacheEntry`, keyed by `pageId` — not five separate per-stage
entries. Every pipeline stage before Diagnostics is pure given
`(page, graph, configurationReport)`, so caching the assembled result
is equivalent to caching Metadata/Schema/Relationships/Commercial/
Diagnostics individually (all five are already inside the cached
`SEORuntimeResult`) while being considerably simpler to reason about.
The relationship graph and configuration report are cached separately
(`readGraph`/`writeGraph`, `readConfigurationReport`/
`writeConfigurationReport`) since they're shared prerequisites across
every page, not per-page data.

## Future providers

A Redis, filesystem, or edge-KV provider implements the same
`RuntimeCacheProvider<TCache>` interface with its own `TCache` shape
(e.g. a cache key/connection handle instead of an in-memory `Map`) and
is passed to `createSEORuntime(provider)` in place of
`MemoryCacheProvider` — no change to `runtime.ts`, `pipeline/`, or any
`integration/` module is required. This is "future cache providers
supported" as a property of the interface, not a promise this phase
implements ahead of real need.

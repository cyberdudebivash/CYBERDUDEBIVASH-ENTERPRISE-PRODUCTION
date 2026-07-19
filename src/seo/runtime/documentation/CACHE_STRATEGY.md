# Cache Strategy

Owns: why the Runtime's cache is built the way it is — one factory, one
interface, one instance, no bare mutable global. See `cache/types.ts`,
`cache/memoryCacheProvider.ts`, and `integration/generateSEO.ts`.

## The Interface

```ts
interface SEORuntimeCacheProvider<T> {
  get(key: string): T | undefined;
  has(key: string): boolean;
  set(key: string, value: T): void;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
}
```

Generic over `T` so the same interface backs both `generateSEO()`'s
`SEORuntimeResult` cache today and any future cached value this platform
adds — a `checkRuntimeHealth()` result cache, for instance — without
this interface changing.

## The One Implementation: `MemoryCacheProvider`

```ts
export function createMemoryCacheProvider<T>(): SEORuntimeCacheProvider<T> {
  const store = new Map<string, T>();
  return { get(key) { return store.get(key); }, /* ...set/has/delete/clear/size */ };
}
```

`createMemoryCacheProvider` is a **factory function**, not an exported
singleton instance. The `Map` it closes over is private to the one
object each call returns — nothing outside the returned object can reach
in and mutate `store` directly. This is the "no mutable globals"
instruction made concrete: the failure mode it rules out is a bare
`let cache: Record<string, T> = {}` at module scope with `cache[key] =
value` sprinkled across multiple files, which is both an accidental
shared-state hazard between unrelated callers and untestable in
isolation (every test would share the same state unless it manually
resets a global). A closure-scoped `Map`, returned once per factory
call, has neither problem.

## Where the One Instance Lives

`integration/generateSEO.ts` holds the platform's single long-lived
cache instance:

```ts
const runtimeCache: SEORuntimeCacheProvider<SEORuntimeResult> = createMemoryCacheProvider<SEORuntimeResult>();
```

This is `const`, not `let` — the *reference* to the cache object never
changes; every mutation goes through `runtimeCache.get/set/delete/clear`,
never through reassigning what `runtimeCache` points at. Every test that
needs a clean cache calls the exported `clearRuntimeCache()` (which
delegates to `runtimeCache.clear()`) rather than reaching into module
internals — see `tests/generateSEO.test.ts`.

## Cache Semantics

- **Key**: `pageId`, exactly as passed to `generateSEO()`.
- **Population**: only on a successful `runPipeline()` call. A thrown
  `SEORuntimeError` is never cached — `runtimeCache.set()` is only
  reached after `runPipeline()` returns normally, so a transient failure
  (e.g. a config edit briefly leaving a page's data invalid) can never
  poison the cache; the next call for that page tries again fresh. See
  `tests/generateSEO.test.ts`'s "a thrown error is never cached" test.
- **`options.skipCache: true`**: bypasses both the read and the write
  for that one call — useful for a caller that always wants a
  guaranteed-fresh result (`checkRuntimeHealth()`'s `pipeline` dimension
  calls `runPipeline()` directly instead, deliberately skipping
  `generateSEO()`'s cache entirely for the same reason — see
  `RUNTIME_HEALTH.md`).
- **Invalidation**: none, automatically. There is no TTL, no
  config-change listener, no size limit. The cache lives for the
  lifetime of the process (or, in tests, until `clearRuntimeCache()` is
  called). This is a deliberate scope decision for Phase 1.5, not an
  oversight — see Known Risks.

## Future Provider Abstraction

A future provider (Redis, a CDN edge cache, an in-process LRU with
eviction) is a new file implementing `SEORuntimeCacheProvider<T>` — see
`cache/types.ts`'s header comment. Nothing in `pipeline/`,
`diagnostics/`, or `health/` depends on `MemoryCacheProvider`
specifically; only `integration/generateSEO.ts` constructs one, so
swapping providers is a one-file change plus (if the new provider is
async) a signature change to `generateSEO()` itself — not attempted in
this phase, since no real requirement for a second provider exists yet.

## Known Risks

- **No eviction.** A process that calls `generateSEO()` for every page
  keeps every `SEORuntimeResult` in memory indefinitely — at 17 pages
  today this is trivial; it is not a general-purpose cache with size
  bounds, and was not built as one, since nothing in this phase's scope
  calls for it.
- **No cross-process sharing.** Each Node process gets its own
  in-memory cache; a multi-process deployment would see redundant
  pipeline runs across processes. The "Future provider abstraction"
  section above is exactly the extension point for solving that, deferred
  until a real multi-process deployment exists to solve it for.

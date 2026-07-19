import type { SEORuntimeCacheProvider } from "./types";

// MemoryCacheProvider — the Runtime's only cache implementation for
// this phase (see documentation/CACHE_STRATEGY.md for why a future
// provider is a new file, not a change here). `createMemoryCacheProvider`
// is a factory, not an exported instance: the `Map` it closes over is
// private to the one object this call returns, never a bare module-level
// `let`/mutable export another file could reach in and mutate directly.
// integration/generateSEO.ts holds the platform's one long-lived
// instance; every test that needs a cache creates its own via this same
// factory instead of sharing state across tests.

export function createMemoryCacheProvider<T>(): SEORuntimeCacheProvider<T> {
  const store = new Map<string, T>();

  return {
    get(key) {
      return store.get(key);
    },
    has(key) {
      return store.has(key);
    },
    set(key, value) {
      store.set(key, value);
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
  };
}

// Owns: the cache abstraction every Runtime cache implementation must
// satisfy. Generic over the cached value so this same interface backs
// both the SEORuntimeResult cache (integration/generateSEO.ts) and any
// future cache this platform adds — a future provider (Redis, a CDN
// edge cache, etc.) is a new file implementing this interface, never a
// change to this interface itself or to the pipeline/integration code
// that depends on it.

export interface SEORuntimeCacheProvider<T> {
  get(key: string): T | undefined;
  has(key: string): boolean;
  set(key: string, value: T): void;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
}

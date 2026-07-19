import type { RelationshipGraph } from "../../relationships";
import type { SEOValidationReport } from "../../reports";
import type { RuntimeCacheEntry, RuntimeCacheProvider } from "./types";

// memoryCache — the runtime's only cache implementation, per this
// phase's own "Memory implementation only" instruction. Every
// operation returns a NEW MemoryRuntimeCache value; nothing here is a
// module-level `let`, and EMPTY_CACHE below is a frozen starting
// value that is itself never mutated (only ever read as the initial
// value passed to `create()`'s caller).

export interface MemoryRuntimeCache {
  readonly pages: ReadonlyMap<string, Readonly<RuntimeCacheEntry>>;
  readonly graph: RelationshipGraph | undefined;
  readonly configurationReport: SEOValidationReport | undefined;
}

const EMPTY_CACHE: MemoryRuntimeCache = Object.freeze({
  pages: new Map(),
  graph: undefined,
  configurationReport: undefined,
});

export const MemoryCacheProvider: RuntimeCacheProvider<MemoryRuntimeCache> = {
  create: () => EMPTY_CACHE,
  readPage: (cache, pageId) => cache.pages.get(pageId),
  writePage: (cache, pageId, entry) => ({ ...cache, pages: new Map(cache.pages).set(pageId, entry) }),
  readGraph: (cache) => cache.graph,
  writeGraph: (cache, graph) => ({ ...cache, graph }),
  readConfigurationReport: (cache) => cache.configurationReport,
  writeConfigurationReport: (cache, configurationReport) => ({ ...cache, configurationReport }),
};

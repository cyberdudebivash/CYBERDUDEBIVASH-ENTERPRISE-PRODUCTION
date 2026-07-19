import { runPipeline } from "./pipeline/runtimePipeline";
import { buildValidatedRelationshipGraph } from "./integration/relationshipIntegration";
import { buildValidatedConfigurationReport } from "./integration/configurationIntegration";
import { MemoryCacheProvider } from "./cache/memoryCache";
import type { RuntimeCacheProvider } from "./cache/types";
import type { MemoryRuntimeCache } from "./cache/memoryCache";
import type { SEORuntimeResult } from "./contracts/types";

// runtime — the Enterprise SEO Runtime Platform's single public entry
// point. "No page, React component, build script, CLI, API, or future
// automation may call individual engines directly. Everything flows
// through the runtime." generateSEO() below, and createSEORuntime()'s
// generateSEO() method, are the ONLY two ways this platform is meant
// to be consumed — see documentation/PUBLIC_API.md.

/**
 * generateSEO(pageId) — the runtime contract exactly as specified.
 * Stateless and deterministic: no cache, no memoization, no
 * module-level mutable state. Every call re-runs the full pipeline
 * (Configuration -> Validation -> Metadata -> Schema -> Relationships
 * -> Commercial -> Diagnostics) and always returns the same result for
 * the same configuration. Throws a typed error (see contracts/errors)
 * on any failure — never returns a partial result.
 *
 * Callers generating output for many pages in one process (a build
 * script, an SSR server) should prefer createSEORuntime() instead,
 * which reuses the expensive-to-build relationship graph and
 * configuration report across every page rather than rebuilding them
 * per call.
 */
export function generateSEO(pageId: string): SEORuntimeResult {
  return runPipeline(pageId, buildValidatedRelationshipGraph(), buildValidatedConfigurationReport());
}

export interface SEORuntime {
  generateSEO(pageId: string): SEORuntimeResult;
}

/**
 * An explicit, caller-owned cached runtime — the CACHE section's
 * abstraction in actual use. Cache state lives in a closure variable
 * private to the single object this call returns, never a module-level
 * export: two independent createSEORuntime() calls never share or leak
 * state into one another, so nothing here is a "global." `provider`
 * defaults to MemoryCacheProvider (this phase's only implementation)
 * but accepts any conforming RuntimeCacheProvider, satisfying "future
 * cache providers supported" without this factory needing to change.
 */
export function createSEORuntime(provider: RuntimeCacheProvider<MemoryRuntimeCache> = MemoryCacheProvider): SEORuntime {
  let cache = provider.create();

  return {
    generateSEO(pageId: string): SEORuntimeResult {
      const cached = provider.readPage(cache, pageId);
      if (cached) return cached.result;

      let graph = provider.readGraph(cache);
      if (!graph) {
        graph = buildValidatedRelationshipGraph();
        cache = provider.writeGraph(cache, graph);
      }

      let configurationReport = provider.readConfigurationReport(cache);
      if (!configurationReport) {
        configurationReport = buildValidatedConfigurationReport();
        cache = provider.writeConfigurationReport(cache, configurationReport);
      }

      const result = runPipeline(pageId, graph, configurationReport);
      cache = provider.writePage(cache, pageId, { result });
      return result;
    },
  };
}

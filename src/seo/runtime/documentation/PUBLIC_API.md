# Public API

`src/seo/runtime/` is the **only** supported entry point into the SEO
platform. Everything in this file is exported from `src/seo/runtime`
(and re-exported from `src/seo/index.ts`).

## `generateSEO(pageId: string): SEORuntimeResult`

The runtime contract exactly as specified:

```ts
function generateSEO(pageId: string): SEORuntimeResult;

interface SEORuntimeResult {
  metadata: PageMetadata;                    // Phase 1.1
  schemas: PageSchemaSet;                    // Phase 1.2
  relationships: RelationshipRecommendation[]; // Phase 1.3
  commercial: CommercialEntityView | undefined; // Phase 1.4 — only "about" today
  diagnostics: RuntimeDiagnostics;             // this phase
}
```

Stateless and deterministic: no cache, no memoization, no module-level
mutable state. Every call re-runs the full pipeline
(`PIPELINE_ARCHITECTURE.md`) and always returns the same substantive
data for the same `pageId` against the same committed configuration.
Throws one of the six typed errors below on any failure — never
returns a partial result.

## `createSEORuntime(provider?): SEORuntime`

```ts
interface SEORuntime {
  generateSEO(pageId: string): SEORuntimeResult;
}
```

An explicit, caller-owned cached runtime. Prefer this over the
stateless `generateSEO()` when generating output for many pages in one
process (a build script, an SSR server): it builds the relationship
graph and configuration report exactly once, and caches each page's
result after its first computation. Cache state lives in a closure
private to the object this call returns — two independent
`createSEORuntime()` calls never share or leak state into one another.
See `CACHE_STRATEGY.md`.

## `getRuntimeHealth(): RuntimeHealthReport` / `assertRuntimeHealthy(report?)`

A platform-wide fitness snapshot, separate from any one page's
`diagnostics`. See `RUNTIME_HEALTH.md`.

## Typed errors (`contracts/errors.ts`)

Every failure path throws one of these — never a bare `Error`:

| Class | Code | Thrown when |
|---|---|---|
| `ConfigurationError` | `CONFIGURATION_ERROR` | An unknown `pageId` (or other unresolved reference) is requested |
| `PipelineError` | `PIPELINE_ERROR` | A composed engine fails for a reason that isn't itself a validation failure |
| `ValidationError` | `VALIDATION_ERROR` | A composed engine's own validator reports an error-severity issue |
| `RelationshipError` | `RELATIONSHIP_ERROR` | The relationship graph, or a page's recommendations, fail Phase 1.3's own validation |
| `RuntimeHealthError` | `RUNTIME_HEALTH_ERROR` | `assertRuntimeHealthy()` finds platform-wide status `"error"` |
| `DuplicateEntityError` | `DUPLICATE_ENTITY_ERROR` | A duplicate-detection check (duplicate `@id`, duplicate edge, duplicate recommendation) fails, regardless of which stage caught it |

All six extend the abstract `SEORuntimeError` (itself extending
`Error`), so `instanceof SEORuntimeError` catches any of them, and
`error.code` gives a stable, machine-readable discriminant without
parsing a message string.

## Adapters (`adapters/`)

Transformation-only functions consuming an already-computed
`SEORuntimeResult` — no business logic, nothing here recomputes any
SEO data:

| Function | Consumer | Returns |
|---|---|---|
| `toStaticHtmlHead(result)` | Static HTML generation | Structured `{ title, metaTags, linkTags, jsonLd }` |
| `toSEOHeadProps(result)` | React | Plain, serializable props (`SEOHeadProps`) a head-management component can spread |
| `renderSSRHead(result)` | SSR | One escaped HTML string ready to inject into `<head>` |
| `renderCLIReport(result)` | CLI / tooling | A short human-readable text report |

A "Future API" adapter (a JSON/REST response) needs no code of its
own: `SEORuntimeResult` is already a plain, `JSON.stringify`-able
object.

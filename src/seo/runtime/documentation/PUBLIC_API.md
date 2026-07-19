# Runtime Public API

Owns: the complete, exhaustive public surface of `src/seo/runtime`. If a
function, type, or class is not documented on this page, it is an
internal implementation detail and importing it directly from outside
`src/seo/runtime/` is not supported (`SEO_RUNTIME.md`'s "Runtime as the
only public contract" decision).

## `generateSEO(pageId, options?)`

```ts
import { generateSEO } from "src/seo/runtime";

function generateSEO(pageId: string, options?: SEORuntimeOptions): SEORuntimeResult;

interface SEORuntimeOptions {
  /** Bypasses the cache for this call, both reading and writing. Default false. */
  skipCache?: boolean;
}
```

The Runtime Contract's single public API, exactly as specified: the
literal call `generateSEO(pageId)` works unchanged — `options` is
optional and additive, not a required second argument.

**Returns** `SEORuntimeResult`:

```ts
interface SEORuntimeResult {
  pageId: string;
  metadata: PageMetadata;            // Phase 1.1, unmodified
  schemas: PageSchemaSet;            // Phase 1.2, unmodified
  relationships: RelationshipRecommendation[]; // Phase 1.3, unmodified
  commercial: CommercialEntityView | undefined; // Phase 1.4, unmodified
  diagnostics: SEORuntimeDiagnostics; // this phase's own addition
}
```

`commercial` is `undefined` for any page outside the Phase 1.4 pilot (12
entities) — a valid, expected result, never a failure. See
`ENGINE_INTEGRATION.md`.

**Throws** one of the six typed errors in `contracts/errors.ts` — never a
bare `Error`, never a partial/malformed `SEORuntimeResult`:

| Error | When |
|---|---|
| `ConfigurationError` | `pageId` is empty, or does not resolve to a real page |
| `DuplicateEntityError` | more than one `PAGES` entry shares `pageId` |
| `ValidationError` | the whole-platform validation report has an error-severity issue |
| `PipelineError` | the Metadata, Schema, or Commercial stage failed to compose |
| `RelationshipError` | the relationship graph or this page's recommendations failed validation |

(`RuntimeHealthError` is never thrown by `generateSEO()` — only by
`checkRuntimeHealth()`; see `RUNTIME_HEALTH.md`.)

**Caching**: a call for a `pageId` already in the cache returns the
cached `SEORuntimeResult` by reference, without re-running the pipeline.
`options.skipCache: true` bypasses this in both directions (read and
write) for that one call. See `CACHE_STRATEGY.md`.

## `checkRuntimeHealth()`

```ts
import { checkRuntimeHealth } from "src/seo/runtime";

function checkRuntimeHealth(): SEORuntimeHealthCheck;
```

The platform-wide self-check — see `RUNTIME_HEALTH.md` for the full
shape and semantics. Never throws for an expected finding (a validation
issue, a broken graph); only throws `RuntimeHealthError` if computing
the check itself crashes unexpectedly.

## Adapters

Four pure transformation functions, each taking a `SEORuntimeResult` and
returning a different consumable shape — no business logic, nothing they
compute isn't already in the result they were given. See
`ENGINE_INTEGRATION.md`'s Adapters section.

```ts
import { renderStaticHead, renderSSRHeadTags, toReactHeadProps, renderCLISummary } from "src/seo/runtime";

function renderStaticHead(result: SEORuntimeResult): string;
function renderSSRHeadTags(result: SEORuntimeResult): string[];
function toReactHeadProps(result: SEORuntimeResult): ReactHeadProps;
function renderCLISummary(result: SEORuntimeResult): string;
```

`buildHeadTags`/`serializeHeadTag`/`HeadTag` (from `adapters/headTags.ts`)
are also exported — the shared descriptor list every adapter above is
built from, useful for a future adapter that needs the same tag list in
a different serialization.

## Contracts

Every type and error a consumer needs to name, from `contracts/`:

- **Types** (`contracts/types.ts`): `SEORuntimeResult`,
  `SEORuntimeDiagnostics`, `SEORuntimeOptions`, and the five diagnostics
  sub-shapes (`SEOMetadataDiagnostics`, `SEOSchemaDiagnostics`,
  `SEORelationshipDiagnostics`, `SEOCommercialDiagnostics`,
  `SEOValidationDiagnostics`, `SEOCoverageDiagnostics`).
- **Errors** (`contracts/errors.ts`): `SEORuntimeError` (the abstract
  base — safe to `catch (e) { if (e instanceof SEORuntimeError) ... }`
  for "any Runtime failure"), and the six concrete subclasses:
  `ConfigurationError`, `PipelineError`, `ValidationError`,
  `RelationshipError`, `RuntimeHealthError`, `DuplicateEntityError`.
  Every error carries `.code` (a stable `SEORuntimeErrorCode` string)
  and `.stage` (which pipeline stage raised it).

## What Is Deliberately Not Public

- `pipeline/`'s `runPipeline()` and individual stage functions — call
  `generateSEO()` instead; it adds caching for free.
- `cache/`'s `createMemoryCacheProvider()` — an implementation detail of
  `integration/generateSEO.ts`. `clearRuntimeCache()` and
  `getRuntimeCacheSize()` ARE exported (from `integration/`, re-exported
  at the top level) for tests and future admin tooling, but the provider
  factory itself is not.
- `src/seo/metadata`, `src/seo/schema`, `src/seo/relationships`,
  `src/seo/commercial` themselves — importable directly today (this
  phase did not remove that ability), but no longer the intended path
  for a new consumer once `generateSEO()` exists. See `SEO_RUNTIME.md`'s
  Architecture Decision 1.

# Enterprise SEO Runtime Platform

Phase 1.5 deliverable. Integrates every prior engine — the Phase 1.1
Metadata Engine, Phase 1.2 Schema Platform, Phase 1.3 Relationship
Platform, and Phase 1.4 Commercial Intelligence Layer — behind one
public contract: `generateSEO(pageId)`. This is now the **only**
supported way to consume the SEO platform; every engine listed above
becomes an internal implementation detail the runtime composes, never
one a future consumer calls directly. See `PIPELINE_ARCHITECTURE.md`,
`PUBLIC_API.md`, `ENGINE_INTEGRATION.md`, `RUNTIME_HEALTH.md`, and
`CACHE_STRATEGY.md` for the companion documents this file references
throughout.

## Executive Summary

The Runtime Platform is complete: 8 directories (`contracts/`,
`integration/`, `pipeline/`, `cache/`, `diagnostics/`, `health/`,
`adapters/`, `tests/`, plus `documentation/`), 27 source files
implementing the pipeline itself and 14 test files (66 new tests). Every
one of the real 17 pages runs the full pipeline — Configuration →
Validation → Metadata → Schema → Relationships → Commercial →
Diagnostics → Runtime Result — with **zero pipeline errors**. A pilot
comparison (see below) confirms the runtime's output is
**byte-identical** to calling each engine directly. `npm run lint` and
`npm run build` both pass; the production bundle's module count is
identical before and after this phase (2121 modules both times, verified
by stashing `src/seo/runtime/` and rebuilding). 66 new unit tests pass
alongside the 230 tests already in the repository from Phases
1.0.5–1.4 (296/296 total).

### Resume context

This phase began as a continuation of an interrupted session (see
`documentation/SEO_MIGRATION_PLAN.md`'s sibling resume protocols for
Phases 1.1 and 1.5). Per Step 0 of the resume protocol, `src/seo/runtime/`
was inspected before writing anything and found **not to exist at all**
in this checked-out branch — the interrupted session's `contracts/`
work had been created inside a container that was reclaimed before it
was committed, so nothing survived to resume from. Phases 1.0–1.4 were
confirmed merged into `main` (PR #12), and the branch was otherwise
identical to `origin/main`. This platform was therefore built fresh
against the real, current repository state, following the same
architecture the resume prompt specified.

## Runtime Architecture

```
Configuration
    ↓
Validation           (buildValidatedConfigurationReport — all 16 domain validators)
    ↓
Metadata              (Phase 1.1: generatePageMetadata)
    ↓
Schema                (Phase 1.2: composePageSchemaSet + validatePageSchemaSet)
    ↓
Relationships          (Phase 1.3: buildRelationshipGraph + generateAllRecommendationsFor + validateRecommendations)
    ↓
Commercial             (Phase 1.4: buildCommercialView + validateCommercialView, when a profile exists)
    ↓
Diagnostics            (this phase: aggregated summary of every stage above)
    ↓
Runtime Result         { metadata, schemas, relationships, commercial, diagnostics }
```

Every arrow above is a function call in `pipeline/runtimePipeline.ts`,
composed in this exact order and no other. No stage duplicates another
engine's logic; each is a thin wrapper in `integration/` that calls the
real engine's own public API and re-types any failure as one of this
platform's typed errors (see `contracts/errors.ts`).

## Architecture Decisions

1. **`generateSEO(pageId)` is a plain function, not a class**, matching
   the zero-classes precedent set by every builder/engine in Phases
   1.0–1.4. The one exception is the typed error hierarchy
   (`SEORuntimeError` and its 6 subclasses) — "Typed errors only" is a
   genuinely new requirement this phase introduces, and JavaScript's
   `instanceof`-based error discrimination is naturally class-shaped;
   no other part of this platform uses a class.

2. **`integration/` wrappers never touch a downstream engine's public
   API.** Every function in `integration/*.ts` calls an existing
   exported function (`generatePageMetadata`, `composePageSchemaSet`,
   `buildRelationshipGraph`, `buildCommercialView`, ...) and reshapes
   only the *failure* path into a typed error. No business logic is
   duplicated — composition, not inheritance, exactly as instructed.

3. **The relationship graph and configuration report are built once
   per multi-page run, not once per page.** `runPipeline()` accepts
   both as optional parameters (defaulting to a fresh build); callers
   processing many pages (`createSEORuntime()`, `getRuntimeHealth()`)
   build each exactly once and pass it through every page's pipeline
   run. A cold single-page `generateSEO()` call still rebuilds both
   fresh every time, honoring the literal `generateSEO(pageId)`
   contract with no hidden state.

4. **Commercial is legitimately `undefined` for 16 of the 17 pages.**
   Phase 1.4's own pilot scope populated commercial profiles for
   `about` (a page) plus 6 services and 5 products (`CommercialEntityKind`
   values that are *not* pages — see `ENGINE_INTEGRATION.md`). Since
   `generateSEO(pageId)` can only ever resolve a `page`-kind commercial
   profile, `about` is the only page whose runtime result has
   `commercial !== undefined`. This was verified directly (see Pilot
   Comparison below), not assumed.

5. **Diagnostics re-validates already-produced data rather than
   threading validation issues through `integration/`.** Each
   integration wrapper only needs error-severity issues to decide
   whether to throw; `diagnostics/buildDiagnostics.ts` needs the full
   issue set (including warnings) for reporting. Re-running each
   engine's own pure, cheap validator a second time against data
   that's already been computed is simpler than widening every
   integration wrapper's return type to carry issues forward, and
   costs nothing extra in practice (single-page validation is
   sub-millisecond).

6. **Health is platform-wide; Diagnostics is per-page.** The HEALTH
   section's five-way status breakdown (configuration / pipeline /
   relationships / validation / commercial) reads as a fitness
   snapshot of the whole platform, not one page — so
   `health/buildHealth.ts` runs the pipeline against every real page
   and aggregates, deliberately separate from the per-page
   `RuntimeDiagnostics` embedded in every `SEORuntimeResult`. See
   `RUNTIME_HEALTH.md`.

7. **Adapters are pure transformations with zero business logic.**
   `staticHtmlAdapter.ts` builds structured head-tag data;
   `reactAdapter.ts` and `ssrAdapter.ts` both reuse it rather than
   re-deriving it (`ssrAdapter.ts` additionally escapes attribute
   values and `</` sequences inside the JSON-LD payload — a real SSR
   concern the other two, which hand back structured data rather than
   markup, don't have); `cliAdapter.ts` reshapes a result into a
   terminal report. None of the four decide what any field's value is.

## Pilot Comparison

Per this phase's PILOT section, the runtime was run against `about.html`,
the `services` page, and (see below) the products reachable through
`home`, and compared directly against calling every engine independently:

| Page | Runtime schema nodes | Runtime relationships | Runtime commercial | Identical to direct engine calls? |
|---|---|---|---|---|
| `about` | 4 | 0 | present (readiness 69) | **Yes** — `assert.deepEqual` against `generatePageMetadata`/`composePageSchemaSet`/`generateAllRecommendationsFor`/`buildCommercialView` called directly passes with zero diffs |
| `services` | 5 | 4 | not applicable | **Yes** — same assertion, zero diffs |

`services` (the real services listing page, `/services.html`) resolves
exactly one live `Service` schema node — the one real `SEOService`
record (`pentest`) whose own `url` matches that page's path; the other
5 services attach to their own distinct pages (`soc-services.html`,
`compliance.html`, `bug-bounty.html`, `vciso.html`) or (`mssp`) have no
`url` at all, per Phase 1.2's own `serviceProducer` (unchanged, composed
as-is).

**Products are not independently addressable through `generateSEO(pageId)`**
— there is no `products` page in the real `PAGES` registry (17 pages:
`home, about, apps, bug-bounty, compliance, contact, dark-web-monitor,
item, platforms, pricing, privacy, research, services, soc-services,
status, threat-intel, vciso`). This was verified directly rather than
assumed. The 5 real `SEOProduct` records are reachable only through
whichever page's `relatedEntityIds` references them — today, only
`home` does, and only 4 of the 5 (`apex, ai_hub, tools, official` — not
`blog`, matching Phase 1.2's own already-documented finding). Running
`generateSEO("home")` confirms this directly: its schema graph contains
exactly 4 `SoftwareApplication` nodes alongside `Organization`,
`WebSite`, `WebPage`, `BreadcrumbList`, and `LocalBusiness` (9 nodes
total). This is real, evidenced platform state — the same kind of gap
Phase 1.3 documented for its own `about.html` pilot (no `relatedEntityIds`
set for that page) — not a defect in this phase's own composition.

## Files Created

27 source files under `src/seo/runtime/` (`contracts/` 3,
`integration/` 8, `pipeline/` 2, `cache/` 3, `diagnostics/` 2,
`health/` 2, `adapters/` 5, plus `runtime.ts` and the top-level
`index.ts`), 14 test files (66 tests) under `src/seo/runtime/tests/`,
and 6 documentation files under `src/seo/runtime/documentation/`.

## Files Modified

`src/seo/index.ts` — one addition: `export * from "./runtime";`. No
other file from any prior phase was touched.

## Integration Matrix

| Runtime stage | Composes | Never |
|---|---|---|
| Configuration/Validation | `generateValidationReport()` (all 16 domain validators, Phase 1.0.5) | Re-implements any domain validator |
| Metadata | `generatePageMetadata()` (Phase 1.1) | Re-derives title/description/OG/Twitter/canonical |
| Schema | `composePageSchemaSet()` + `validatePageSchemaSet()` (Phase 1.2) | Emits a `<script>` tag itself (adapters do, one layer up) |
| Relationships | `buildRelationshipGraph()` + `generateAllRecommendationsFor()` + `validateRecommendations()` (Phase 1.3) | Re-implements ranking or graph traversal |
| Commercial | `buildCommercialView()` + `validateCommercialView()` (Phase 1.4), only when a `page`-kind profile exists | Fabricates a profile for a page that has none |

See `ENGINE_INTEGRATION.md` for the full detail behind each row.

## Dependency Matrix

`runtime/` depends on `metadata/`, `schema/`, `relationships/`,
`commercial/`, `validators/`, `reports/`, `config/`, and `types/`. No
dependency runs the other direction: nothing outside `runtime/` (and
nothing in Phases 1.0–1.4) imports from `src/seo/runtime/` yet, so this
phase introduces zero risk of a circular dependency and zero bundle
impact (confirmed by the stash-and-rebuild test — see Verification
Results).

## Testing Summary

66 new tests across 14 files:

| File | What it covers |
|---|---|
| `resolvePage.test.ts` | Page resolution, typed `ConfigurationError` for unknown ids |
| `configurationIntegration.test.ts` | Platform-wide validation gate |
| `metadataIntegration.test.ts` | Parity with Phase 1.1's own output, for every page |
| `schemaIntegration.test.ts` | Parity with Phase 1.2's own output; zero validation errors |
| `relationshipIntegration.test.ts` | Real graph shape (43 nodes/107 edges); parity with Phase 1.3 |
| `commercialIntegration.test.ts` | `about`-only commercial resolution; no fabricated data |
| `memoryCache.test.ts` | Immutability — every write returns a new cache, never mutates the one given |
| `runtimePipeline.test.ts` | End-to-end pipeline, determinism, typed errors, zero errors across all 17 pages |
| `runtime.test.ts` | `generateSEO()`/`createSEORuntime()` contract shape, statelessness, cache isolation |
| `buildDiagnostics.test.ts` | Coverage flags, summaries match real computed data |
| `buildHealth.test.ts` | Five-way status, `assertRuntimeHealthy()` |
| `adapters.test.ts` | Static/React/SSR/CLI transformation correctness, SSR script-injection escaping |
| `errors.test.ts` | Every typed error's `instanceof`, `name`, `code`, message |
| `regression.test.ts` | Real-data regressions: `vciso` collision, `home` LocalBusiness, 81-node total, no mutation of `PAGES` |

## Verification Results

- `npm run lint`: 0 errors.
- `npm run build`: 2121 modules — identical before and after this
  phase (confirmed by stashing `src/seo/runtime/` + `src/seo/index.ts`
  and rebuilding).
- Full test suite: **296/296 pass** (230 pre-existing across Phases
  1.0.5–1.4, unmodified and still green; 66 new).
- Every one of the 17 real pages: `generateSEO(pageId)` returns with
  **zero pipeline errors**.
- Platform-wide `getRuntimeHealth()`: `pipeline: "healthy"`,
  `status: "warning"` — matching this phase's own pre-implementation
  baseline exactly (0 errors / 106 warnings / 13 info across the 16
  domain validators; 0 errors / 14 warnings on the relationship graph;
  0 errors / 45 warnings across the 12 commercial views). See
  `RUNTIME_HEALTH.md`.

## Known Risks

1. **Commercial coverage is inherently narrow through `generateSEO(pageId)`.**
   Only `about` resolves a commercial view; the 6 services and 5
   products Phase 1.4 enriched are not reachable by page id at all.
   A future phase wanting `generateSEO()` to surface product/service
   commercial data would need a page-to-entity association this data
   model doesn't have today (a real, evidenced gap — not something
   this phase should invent a value for).
2. **`getRuntimeHealth()` re-runs the full pipeline for all 17 pages
   on every call.** At current scale (17 pages, sub-2ms per page) this
   is trivial (well under 50ms total), but it is O(pages), not O(1);
   a future phase adding meaningfully more pages should revisit
   whether health checks need their own caching.
3. **`createSEORuntime()`'s cache never evicts.** A long-lived process
   calling it for a very large, growing set of pages would grow the
   cache unboundedly. Out of scope for a 17-page platform today; a
   future cache provider (see `CACHE_STRATEGY.md`) can add eviction
   without changing `RuntimeCacheProvider`'s interface.

## Recommendations for Phase 2

Per the POST-RUNTIME RULE, every future phase (automation, static
generation, CI/CD, Search Console integration, AI SEO) should consume
`generateSEO(pageId)` (or `createSEORuntime()` for multi-page work)
exclusively — never an individual engine. A build-time static generation
phase is the most natural next consumer: it would call
`createSEORuntime()` once, loop `PAGES`, and use `adapters/staticHtmlAdapter.ts`
or `adapters/ssrAdapter.ts` to emit head tags, with `getRuntimeHealth()`
as a pre-deploy gate (`assertRuntimeHealthy()` failing the build on a
platform-wide "error" status).

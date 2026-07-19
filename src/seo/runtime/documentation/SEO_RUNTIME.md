# Enterprise SEO Runtime Platform

Phase 1.5 deliverable. Composes Phases 1.0.5–1.4 (Validation, Metadata,
Schema, Relationships, Commercial) behind one deterministic pipeline and
one public function, `generateSEO(pageId)`. This phase adds no new SEO
data and no new engine — every field in a `SEORuntimeResult` is produced
by an engine that already existed before this phase started. See
`PIPELINE_ARCHITECTURE.md`, `PUBLIC_API.md`, `ENGINE_INTEGRATION.md`,
`RUNTIME_HEALTH.md`, and `CACHE_STRATEGY.md` for the companion documents
this file references throughout.

## Executive Summary

The Runtime Platform is complete: 28 implementation files under
`src/seo/runtime/` (`contracts/`, `pipeline/`, `cache/`, `diagnostics/`,
`health/`, `adapters/`, `integration/`), composing the five existing
engines into one public contract. `npm run lint` and `npm run build`
both pass; the production bundle's module count is identical before and
after this phase (2121 modules both times) — nothing in `src/seo/runtime/`
is imported by the application yet, so it contributes zero bytes to the
shipped bundle. 43 new unit tests pass alongside the 230 tests already in
the repository (273/273 total).

Every one of the platform's 17 real pages (`PAGES`) generates a complete
`SEORuntimeResult` without error — verified both by a dedicated test
(`runPipeline: succeeds for every real page in PAGES`) and by
`checkRuntimeHealth()`'s own `pipeline` dimension, which runs the same
check operationally. The whole-platform validation baseline this phase
started from — 0 errors, 106 warnings, 13 info, across 16 validators —
is unchanged; the Runtime enforces it (see `ValidationStage` in
`PIPELINE_ARCHITECTURE.md`) rather than merely reporting it.

## Architecture Decisions

1. **Runtime as the only public contract.** `src/seo/runtime/index.ts`
   is the one module this phase intends future consumers to import from
   — `generateSEO`, `checkRuntimeHealth`, the four adapters, and the
   contracts (`SEORuntimeResult`, the six typed errors). Everything else
   under `src/seo/runtime/` (`pipeline/`, `cache/`, `health/`'s internal
   checks) is composed internally, not re-exported from the top-level
   index. `src/seo/metadata`, `src/seo/schema`, `src/seo/relationships`,
   and `src/seo/commercial` remain importable directly today (removing
   that would be a breaking change to code outside this phase's scope),
   but this Runtime is now the intended path for any new consumer.

2. **Compose, never replace.** Not one line inside `src/seo/metadata/`,
   `src/seo/schema/`, `src/seo/relationships/`, `src/seo/commercial/`,
   or `src/seo/validators/` changed during this phase. Every pipeline
   stage (`pipeline/stages/`) calls that phase's own documented public
   entry point — `generatePageMetadata`, `composePageSchemaSet`,
   `buildRelationshipGraph` + the named builders, `buildCommercialView`
   — exactly as each engine's own `index.ts` header comment describes
   it being consumed. See `ENGINE_INTEGRATION.md` for the full mapping.

3. **A fixed, non-extensible pipeline sequence.** Unlike
   `schema/registry/schemaRegistry.ts`'s `DEFAULT_PRODUCERS` (a
   deliberately extensible array of pure producers), `runPipeline()`
   composes its seven stages as one explicit sequence of function calls,
   not a generic array. Every stage after Configuration depends on state
   only an earlier stage produced (Schema needs a resolved page; the
   final Diagnostics stage needs every engine's output) — the sequence
   is a real dependency chain, not a set of independent, reorderable
   plugins, so it is written to read that way.

4. **Six typed errors, not one per engine.** `PipelineError` covers
   Metadata, Schema, and Commercial stage failures generically — the
   RESUME prompt's own error vocabulary names six types, not nine, so a
   ninth ad hoc `MetadataError`/`SchemaError` was not invented. Each
   thrown `PipelineError` carries a `stage` field so a caller can still
   tell which stage failed without a dedicated class per stage. See
   `contracts/errors.ts`.

5. **Diagnostics is page-scoped; Health is platform-scoped.** These are
   easy to conflate (both report "is everything okay") but answer
   different questions: `SEORuntimeDiagnostics` (part of every
   `generateSEO()` result) reports what happened composing *this one
   page*; `SEORuntimeHealthCheck` (`checkRuntimeHealth()`, a separate
   call) reports the state of the *whole platform*, including exercising
   the pipeline for every real page. See `RUNTIME_HEALTH.md`.

## Runtime Architecture

```
src/seo/runtime/
├── contracts/     SEORuntimeResult, SEORuntimeDiagnostics, and the six
│                  typed errors — the shapes every other layer depends on.
├── pipeline/      Configuration -> Validation -> Metadata -> Schema ->
│                  Relationships -> Commercial -> Diagnostics, as one
│                  deterministic sequence (runPipeline.ts + stages/).
├── cache/         SEORuntimeCacheProvider<T> + its one implementation,
│                  MemoryCacheProvider (cache/memoryCacheProvider.ts).
├── diagnostics/   buildDiagnostics() — the Diagnostics stage's own logic,
│                  pulled out of pipeline/ so it has one clear owner.
├── health/        checkRuntimeHealth() — the platform-wide self-check.
├── adapters/      Static HTML, SSR, React, CLI — transformation only.
├── integration/   generateSEO(pageId) — composes pipeline/ + cache/.
├── tests/         43 tests (node:test + node:assert/strict).
├── documentation/ This file and its five companions.
└── index.ts       The Runtime's one public entry point.
```

## Public Runtime API

See `PUBLIC_API.md` for the full contract. In short:

```ts
import { generateSEO, checkRuntimeHealth } from "src/seo/runtime";

const result = generateSEO("about");
// result: { pageId, metadata, schemas, relationships, commercial, diagnostics }

const health = checkRuntimeHealth();
// health: { status, configuration, pipeline, relationships, validation, commercial, issues }
```

## Pipeline Diagram

See `PIPELINE_ARCHITECTURE.md` for the full diagram and per-stage detail.

```
pageId
  │
  ▼
Configuration  (resolve SEOPage; ConfigurationError / DuplicateEntityError)
  │
  ▼
Validation     (whole-platform report; ValidationError if any error-severity issue)
  │
  ▼
Metadata       (generatePageMetadata; PipelineError on failure)
  │
  ▼
Schema         (composePageSchemaSet + validatePageSchemaSet; PipelineError)
  │
  ▼
Relationships  (buildRelationshipGraph + 6 named builders; RelationshipError)
  │
  ▼
Commercial     (COMMERCIAL_PROFILES lookup; undefined is a valid result)
  │
  ▼
Diagnostics    (buildDiagnostics; timing, coverage, summaries, warnings)
  │
  ▼
SEORuntimeResult
```

## Files Created

28 implementation files, 8 test files (43 tests), 6 documentation files —
42 files total under `src/seo/runtime/`. See `ENGINE_INTEGRATION.md`'s
Integration Matrix for which existing engine function each pipeline stage
calls, and this directory listing above for the full file tree.

## Files Modified

None. This phase is purely additive — `src/seo/runtime/` is a new
directory; no file outside it changed. Verified by `git status` showing
only new files under `src/seo/runtime/` and this documentation.

## Testing Summary

- 43 new tests across 8 files under `src/seo/runtime/tests/`
  (`node:test` + `node:assert/strict`, same convention as every prior
  phase), covering: Configuration stage resolution and its two error
  paths; a full-pipeline test for every real page in `PAGES`;
  determinism (two runs for the same page produce identical output);
  the memory cache's full interface plus instance isolation;
  `generateSEO`'s cache-hit/cache-miss/`skipCache`/error-never-cached
  behavior; `checkRuntimeHealth`'s five dimensions and worst-of
  aggregation; all four adapters, including an HTML-escaping and
  JSON-LD script-injection-safety check; and every one of the six typed
  errors' shape.
- Run via `npx tsx --test src/seo/validators/__tests__/*.test.ts
  src/seo/metadata/__tests__/*.test.ts src/seo/schema/tests/*.test.ts
  src/seo/relationships/tests/*.test.ts src/seo/commercial/tests/*.test.ts
  src/seo/runtime/tests/*.test.ts` — 273/273 pass (230 pre-existing,
  unmodified and still green; 43 new).

## Verification Results

| Check | Result |
|---|---|
| `npm install` | clean |
| `npm run lint` (`tsc --noEmit`) | 0 errors |
| `npm run build` | passes, 2121 modules (unchanged) |
| Whole-platform validation (`generateValidationReport`) | 0 errors, 106 warnings, 13 info (unchanged) |
| Test suite | 273/273 (230 pre-existing + 43 new) |
| `runPipeline()` for every page in `PAGES` | 17/17 succeed |
| Files outside `src/seo/runtime/` modified | 0 |

## Known Risks

See `ENGINE_INTEGRATION.md` and `RUNTIME_HEALTH.md` for the risks
specific to composition and health-checking. Platform-wide:

- **Not wired into the application yet.** No route, build step, or
  server code imports `src/seo/runtime` — that is deliberately out of
  scope (see STOP CONDITION below). The build's unchanged module count
  is expected for that reason, not evidence the Runtime "does nothing";
  its own 273-test suite exercises it directly.
- **`checkRuntimeHealth()`'s pipeline check re-runs all 17 pages
  uncached, on every call.** Cheap at today's scale (~30ms observed for
  the whole suite) but does not itself scale-test — see
  `RUNTIME_HEALTH.md`'s Known Risks for the explicit tradeoff.

## Recommendations for Phase 2

Not started, per this phase's STOP CONDITION — recorded here only as
what Phase 2 would need to decide, not begun:

1. Wire `generateSEO()` into an actual build step or server route (the
   first real consumer).
2. Decide whether `checkRuntimeHealth()` becomes an HTTP endpoint (the
   RESUME prompt's own "Future API" adapter placeholder).
3. Extend the Commercial pilot beyond 12 entities once Phase 1.4's own
   Phase 2 recommendations (`COMMERCIAL_MODEL.md`) are acted on — the
   Runtime already handles the "no profile for this page" case
   correctly, so no Runtime change is needed when that happens.

## Stop Condition

This phase stops here. Runtime Platform complete; tests passing (273/273);
runtime outputs deterministic (verified by test); build passing (2121
modules, unchanged); validation unchanged (0 errors, 106 warnings, 13
info); no production files modified (0 files outside
`src/seo/runtime/` touched). Awaiting architectural approval before any
Phase 2 work (automation, CI/CD, static generation, Search Console, AI).

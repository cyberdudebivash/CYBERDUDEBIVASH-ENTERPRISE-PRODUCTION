# Pipeline Architecture

`pipeline/runtimePipeline.ts`'s `runPipeline()` is the runtime's
deterministic execution core. It implements exactly the stage order
this phase specifies, no more and no less:

```
Configuration → Validation → Metadata → Schema → Relationships
    → Commercial → Diagnostics → Runtime Result
```

## Stage-by-stage

1. **Configuration → Validation.** `buildValidatedConfigurationReport()`
   (`integration/configurationIntegration.ts`) runs all 16 domain
   validators (`generateValidationReport()`, Phase 1.0.5) once and
   throws a typed `ValidationError` if any error-severity issue exists
   anywhere in the configuration. This gates every page — a
   config-wide error means the shared data model itself is unsound, so
   it blocks the whole run, not just one page.

2. **Metadata.** `integrateMetadata(page)` calls Phase 1.1's
   `generatePageMetadata()` directly. That function already builds and
   validates internally (throwing on its own error-severity issues);
   this stage's only job is re-typing that failure as a `PipelineError`.

3. **Schema.** `integrateSchema(page)` calls Phase 1.2's
   `composePageSchemaSet()` then `validatePageSchemaSet()` — unlike
   Metadata, the Schema Platform keeps composition and validation as
   two separate calls, so this is the one place that always calls both
   together, throwing `ValidationError` (or `DuplicateEntityError` for
   a duplicate-`@id` failure specifically) on any error.

4. **Relationships.** `buildValidatedRelationshipGraph()` builds and
   validates Phase 1.3's graph once (reused across every page in a
   multi-page run — see below); `integrateRelationships(pageId, graph)`
   then generates and validates this page's own recommendations.

5. **Commercial.** `integrateCommercial(pageId)` resolves a Phase 1.4
   commercial view *if* a profile exists for `(kind: "page", id: pageId)`
   — today, only for `"about"`. No profile is not an error; every other
   page legitimately returns `undefined` here.

6. **Diagnostics.** `buildDiagnostics()` assembles the summary described
   in `SEO_RUNTIME.md`'s Runtime Architecture, from data every stage
   above already produced.

7. **Runtime Result.** The five-field object `{ metadata, schemas,
   relationships, commercial, diagnostics }` — the literal public
   contract.

## Determinism

`runPipeline()` has no I/O, no randomness, no clock reads other than
`diagnostics.generatedAt`/`executionTimeMs` (which are explicitly
excluded from every "is this deterministic" test assertion — see
`tests/runtime.test.ts`'s `withoutTimings()` helper). Given the same
committed configuration, the same `pageId` always produces the same
`metadata`/`schemas`/`relationships`/`commercial` — verified directly
by `tests/runtimePipeline.test.ts`'s "is deterministic" test, which
runs the pipeline twice for the same page and asserts `deepEqual`.

## Reused work across a multi-page run

`runPipeline(pageId, graph?, configurationReport?)` accepts the
relationship graph and the configuration report as optional
parameters, defaulting to a fresh build of each. A caller processing
every page in one process — `createSEORuntime()` (`cache/`) and
`getRuntimeHealth()` (`health/`) — builds both exactly once and passes
them through every page's run, rather than this function silently
rebuilding them 17 times. A single cold `generateSEO(pageId)` call
still rebuilds both fresh, honoring the literal `generateSEO(pageId)`
contract with no hidden state.

# Runtime Pipeline Architecture

Owns: the deterministic seven-stage sequence `pipeline/runPipeline.ts`
composes, and why each stage is ordered exactly where it is. See
`SEO_RUNTIME.md` for the platform overview and `ENGINE_INTEGRATION.md`
for which existing engine function each stage calls.

## The Sequence

```
pageId: string
  │
  ▼
┌─────────────────┐
│  Configuration   │  pipeline/stages/configurationStage.ts
│  resolvePage()   │  PAGES.find(pageId) via utils/lookup.ts's getPageById
└────────┬─────────┘  throws: ConfigurationError, DuplicateEntityError
         ▼
┌─────────────────┐
│   Validation     │  pipeline/stages/validationStage.ts
│runPlatformValid()│  generateValidationReport() — all 16 domain validators
└────────┬─────────┘  throws: ValidationError (any error-severity issue)
         ▼
┌─────────────────┐
│    Metadata      │  pipeline/stages/metadataStage.ts
│runMetadataStage()│  generatePageMetadata(page) + validateMetadata() (warnings only)
└────────┬─────────┘  throws: PipelineError (stage: "metadata")
         ▼
┌─────────────────┐
│     Schema       │  pipeline/stages/schemaStage.ts
│ runSchemaStage() │  composePageSchemaSet(page) + validatePageSchemaSet()
└────────┬─────────┘  throws: PipelineError (stage: "schema")
         ▼
┌─────────────────┐
│  Relationships   │  pipeline/stages/relationshipsStage.ts
│runRelationships()│  buildRelationshipGraph() + 6 named builders + RelatedResearchBuilder
└────────┬─────────┘  throws: RelationshipError
         ▼
┌─────────────────┐
│   Commercial     │  pipeline/stages/commercialStage.ts
│runCommercialSt()│  COMMERCIAL_PROFILES lookup + buildCommercialView() (undefined is valid)
└────────┬─────────┘  throws: PipelineError (stage: "commercial") — only if a profile exists but is broken
         ▼
┌─────────────────┐
│   Diagnostics    │  diagnostics/buildDiagnostics.ts
│ buildDiagnostics │  aggregates every stage's output + collected warnings + timing
└────────┬─────────┘  never throws
         ▼
   SEORuntimeResult
```

## Why This Order

1. **Configuration first.** Every later stage needs a real, resolved
   `SEOPage` — there is nothing correct to validate, generate, or
   compose without one.
2. **Validation before any engine runs.** The RESUME prompt's Step 2
   ("Confirm baseline... If baseline changed, STOP") is not just a
   pre-commit check in this platform — it is enforced on every single
   `generateSEO()` call. Running the whole-platform validation report
   *before* Metadata/Schema/Relationships/Commercial guarantees none of
   those stages ever compose output from a config the platform already
   knows is broken.
3. **Metadata before Schema.** Schema's own `webPageProducer` and
   `breadcrumbProducer` call `generatePageMetadata(page)` internally
   (see `schema/registry/schemaRegistry.ts`) — Schema is *already*
   dependent on Metadata inside Phase 1.2's own code, not a dependency
   this Runtime introduced. Running Metadata first in the Runtime's own
   sequence just makes that existing dependency visible at this layer
   too, and lets `MetadataStage`'s warnings be collected once rather
   than rediscovered every time Schema calls `generatePageMetadata`
   again internally.
4. **Schema before Relationships.** No data dependency — Relationships
   is built entirely from `src/seo/config/`, never from Schema's output.
   Ordered this way because the RESUME prompt's own pipeline diagram
   specifies it, and because Schema failing before Relationships builds
   its (larger, whole-config) graph avoids doing that work for a page
   that is already going to fail.
5. **Commercial last among the engines.** Commercial is the only stage
   whose "no data for this page" outcome (`undefined`) is normal, not a
   failure — ordering it last means a page that has no commercial
   profile still gets full Metadata/Schema/Relationships treatment
   without any special-casing earlier in the sequence.
6. **Diagnostics last, unconditionally.** It observes what already
   happened; it has no engine of its own to fail. Placed last so
   `executionTimeMs` measures the complete pipeline, not a partial run.

## Determinism

Every stage is a pure function of its inputs (`page`, `graph`, or the
prior stage's output) plus `src/seo/config/`'s module-scoped `const`
arrays — never the wall clock, network, filesystem, or any mutable
shared state. `runPipeline("services")` called twice back-to-back
produces `deepEqual` `metadata`/`schemas`/`relationships`/`commercial`
(verified by `tests/runPipeline.test.ts`'s determinism test) — the only
fields that differ between two calls are `diagnostics.generatedAt` and
`diagnostics.executionTimeMs`, both of which exist specifically to
record when/how-long, not what.

## Stage Isolation

Every stage file under `pipeline/stages/` is independently testable and
independently imported (see `tests/stages.test.ts`) — `runPipeline()`
itself contains no engine-calling logic, only the ordered sequence of
calls. This mirrors the RESUME prompt's own instruction to "compose
[engines], never replace them": the composition root
(`runPipeline.ts`) is intentionally thin.

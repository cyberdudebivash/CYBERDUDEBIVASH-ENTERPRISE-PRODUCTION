# Engine Integration

Owns: exactly which function, from which existing engine, each Runtime
pipeline stage calls — the "compose, never replace" decision made
concrete and checkable. Every function named below is unmodified by
this phase; grep any of them against `git log -p` for
`src/seo/runtime/`'s commits and you will find zero changes outside
`src/seo/runtime/` itself.

## Integration Matrix

| Stage | File | Calls | From (Phase) |
|---|---|---|---|
| Configuration | `pipeline/stages/configurationStage.ts` | `getPageById` | `utils/lookup.ts` (1.0) |
| Validation | `pipeline/stages/validationStage.ts` | `generateValidationReport` | `reports/generateReport.ts` (1.0.5) |
| Metadata | `pipeline/stages/metadataStage.ts` | `generatePageMetadata`, `validateMetadata` | `metadata/metadataEngine.ts`, `metadata/metadataValidator.ts` (1.1) |
| Schema | `pipeline/stages/schemaStage.ts` | `composePageSchemaSet`, `validatePageSchemaSet` | `schema/registry/schemaRegistry.ts`, `schema/validators/schemaValidator.ts` (1.2) |
| Relationships | `pipeline/stages/relationshipsStage.ts` | `buildRelationshipGraph`, `buildRelatedPages`, `buildRelatedProducts`, `buildRelatedServices`, `buildRelatedSolutions`, `buildRelatedArticles`, `buildRelatedCategories`, `buildRelatedResearch`, `validateRelationshipGraph`, `validateRecommendations`, `rankRecommendations` | `relationships/*` (1.3) |
| Commercial | `pipeline/stages/commercialStage.ts` | `COMMERCIAL_PROFILES`, `buildCommercialView`, `validateCommercialView` | `commercial/config/*`, `commercial/builders/buildCommercialView.ts`, `commercial/validators/commercialValidator.ts` (1.4) |
| Health (additional) | `health/checkRuntimeHealth.ts` | `PAGES`, `generateValidationReport`, `buildRelationshipGraph`, `validateRelationshipGraph`, `buildAllCommercialViews`, `validateAllCommercialViews`, `runPipeline` | 1.0, 1.0.5, 1.3, 1.4, this phase |

## Dependency Matrix

```
                Configuration  Validation  Metadata  Schema  Relationships  Commercial
Configuration        —
Validation            —            —
Metadata               ✓            —          —
Schema                 ✓            —          ✓         —
Relationships           ✓            —          —         —          —
Commercial              ✓            —          —         —          —              —
```

Read as "row depends on column." Metadata, Schema, Relationships, and
Commercial each depend only on Configuration (the resolved `SEOPage`) —
none of the four engine stages depends on another engine stage's
*output*. Schema's `✓` under Metadata reflects Schema's *internal* call
to `generatePageMetadata()` (inside `webPageProducer`/
`breadcrumbProducer` — see `PIPELINE_ARCHITECTURE.md` point 3), not a
dependency this Runtime introduced.

## Known Gaps (Deliberate, Not Oversights)

1. **7 of the 13 Relationship builders are never called.**
   `buildRelatedDownloads`, `buildRelatedDocumentation`,
   `buildRelatedLearning`, `buildRelatedRepositories`,
   `buildRelatedIndustries`, `buildRelatedTechnologies`, and
   `buildReservedRelated` each require a caller-supplied
   `RelatableCandidate[]` this platform has no real config source for —
   `buildGraph.ts`'s own header comment calls these 6 kinds "reserved,"
   built for the moment real data exists, not for today. Calling them
   with an invented candidate list would fabricate relationships this
   platform's own engineering rules forbid. `RelationshipsStage` calls
   the 6 graph-backed named builders plus `buildRelatedResearch`
   (config-driven, currently always `[]` — see
   `relatedResearchBuilder.ts`) and nothing else.
2. **Commercial is a 12-entity pilot, not full coverage.** Of 17 pages,
   only `about` has a `CommercialProfile` with `entityKind: "page"`
   today (the other 11 pilot entities are products/services, resolved
   by their own id, not a page id — see `resolveCommercialEntity.ts`).
   `CommercialStage` returning `undefined` for the other 16 pages is
   this phase correctly reflecting Phase 1.4's own documented scope, not
   a Runtime limitation.
3. **`MetadataStage` re-validates already-valid metadata.**
   `generatePageMetadata()` already validates internally and throws on
   any error-severity issue — `MetadataStage` calls `validateMetadata()`
   a second time purely to recover the warning-severity issues
   `MetadataEngine`'s own contract discards (see `metadataEngine.ts`'s
   header comment: "throws... never returns a partially-valid object" —
   silent on warnings). This is a deliberate, cheap (pure, no I/O)
   second pass, not a sign the first validation was insufficient.
4. **SSR and Static HTML adapters share identical tag content.** At
   this phase, "server-rendered" and "statically generated" head markup
   are the same data, serialized the same way — the real difference
   (per-tag vs. one joined string) is about *delivery* (streaming
   injection vs. a single write), not content. See `adapters/ssrAdapter.ts`'s
   header comment.
5. **The "Future API" adapter named in the RESUME prompt was not
   built.** No HTTP endpoint exists yet for it to serve. Reserved, per
   this codebase's own established "reserved, not fabricated" pattern
   (`buildGraph.ts`'s 6 reserved relationship kinds) — see
   `adapters/index.ts`'s header comment.

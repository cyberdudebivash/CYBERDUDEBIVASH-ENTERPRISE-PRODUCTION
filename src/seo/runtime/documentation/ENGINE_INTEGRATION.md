# Engine Integration

How the runtime composes each prior phase's engine — by calling its
real public API, never by modifying it or duplicating its logic.
"Composition, not inheritance," applied literally: every function in
`integration/` takes an engine's own exported function and calls it.

## Metadata (Phase 1.1) — `integration/metadataIntegration.ts`

```ts
integrateMetadata(page: SEOPage): PageMetadata
```

Calls `generatePageMetadata(page)` directly. `generatePageMetadata`
already builds *and* validates internally, throwing on any
error-severity issue rather than returning a partial object — so this
wrapper's only responsibility is catching that (untyped) failure and
re-throwing it as a typed `PipelineError`. Verified byte-identical to
calling `generatePageMetadata()` directly, for every real page (see
`tests/metadataIntegration.test.ts`).

## Schema (Phase 1.2) — `integration/schemaIntegration.ts`

```ts
integrateSchema(page: SEOPage): PageSchemaSet
```

Calls `composePageSchemaSet(page)` then `validatePageSchemaSet(schemaSet)`
— the Schema Platform's own public API deliberately keeps these two
calls separate (see `schema/documentation/SCHEMA_ENGINE.md`), so this
is the one place the runtime enforces "no generated schema may bypass
validation" by always calling both together. A duplicate-`@id` failure
is classified as `DuplicateEntityError`; any other error-severity issue
as `ValidationError` (see `integration/classifyIssues.ts`).

## Relationships (Phase 1.3) — `integration/relationshipIntegration.ts`

```ts
buildValidatedRelationshipGraph(): RelationshipGraph
integrateRelationships(pageId: string, graph: RelationshipGraph): RelationshipRecommendation[]
```

`buildValidatedRelationshipGraph()` calls `buildRelationshipGraph()`
then `validateRelationshipGraph(graph)` once; `integrateRelationships()`
calls `generateAllRecommendationsFor(graph, "page", pageId)` then
`validateRecommendations(recommendations, graph)` for that one page.
The graph is genuinely expensive relative to everything else in this
pipeline (43 nodes / 107 edges derived from every config collection),
so multi-page callers build it once and thread it through — see
`PIPELINE_ARCHITECTURE.md`.

## Commercial (Phase 1.4) — `integration/commercialIntegration.ts`

```ts
integrateCommercial(pageId: string): CommercialEntityView | undefined
```

Looks up whether a `CommercialProfile` exists in `COMMERCIAL_PROFILES`
for `(entityKind: "page", entityId: pageId)`. `CommercialEntityKind` has
5 values (`page | product | service | solution | article`); Phase 1.4's
pilot only populated `about` (1 page) plus 6 services and 5 products
(neither of which is a page). Since `generateSEO(pageId)` can only ever
look up a `page`-kind profile, `about` is the *only* page this can ever
resolve — verified directly: `COMMERCIAL_PROFILES.filter(p =>
p.entityKind === "page")` has exactly one entry (`entityId: "about"`).
Every other page returns `undefined`, never a fabricated value.

If the resolved view has any error-severity issue under
`validateCommercialView()`, this throws `ValidationError` — in
practice this has never fired against the real, committed profiles
(0 errors / 45 warnings across all 12 real commercial views, matching
Phase 1.4's own documented baseline).

## Configuration-wide validation — `integration/configurationIntegration.ts`

```ts
buildValidatedConfigurationReport(): SEOValidationReport
```

Calls `generateValidationReport()` (Phase 1.0.5, all 16 domain
validators) once and throws `ValidationError` if
`report.summary.errorCount > 0`. This is the pipeline's first gate —
see `PIPELINE_ARCHITECTURE.md`.

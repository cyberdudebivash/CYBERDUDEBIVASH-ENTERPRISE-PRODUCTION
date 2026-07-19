# Enterprise Internal Linking & Relationship Platform

Phase 1.3 deliverable. Builds a deterministic relationship graph and
ranked internal-link recommendations from the Phase 1.0 data model
(`src/seo/config/`), composing the Phase 1.1 Metadata Engine's output
where page-level context is needed. It **never hardcodes a link inside
a page, never generates HTML, and never touches React** — every
builder is a pure function returning typed data; nothing here renders
or writes anything. See `RELATIONSHIP_GRAPH.md`, `RELATIONSHIP_MAPPING_MATRIX.md`,
and `RECOMMENDATION_STRATEGY.md` for the companion documents this file
references throughout.

## Executive Summary

The Relationship Platform is complete: 6 directories (`graph/`,
`ranking/`, `builders/`, `validators/`, `tests/`, `documentation/`), 27
source files, deriving a 43-node, 107-edge graph entirely from real
config data — **zero validation errors** across the graph itself and
across every recommendation generated for all 17 real pages (36 total
recommendations). `npm run lint` and `npm run build` both pass; the
production bundle's module count is identical before and after this
phase (2121 modules both times). 55 new unit tests pass alongside the
132 tests already in the repository from Phase 1.0.5/1.1/1.2 (187/187
total).

Building this platform's own regression tests against the **real**
graph (rather than only synthetic fixtures), and then re-checking the
guarantees this document itself claims while writing it, caught four
genuine bugs before they shipped — worth stating plainly rather than
glossing over, since finding them is the point of testing against real
data:

1. **A duplicate-edge bug**: two entities sharing *two* targets in
   common (e.g. two products both independently referencing the same
   two services) produced the same edge twice instead of once.
2. **A reverse-traversal typing bug**: `relationType` was read directly
   off a directed edge's stored `type`, which is only correct when
   walking the edge in the direction it was built — walking it
   backward (this graph's traversal is bidirectional by design)
   produced a `relationType` describing the wrong node.
3. **A false-positive self-reference**: `"vciso"` is a real id shared
   by both a page and a service (an ambiguity `SEO_VALIDATION_REPORT.md`
   already documented in Phase 1.0.5) — comparing bare ids alone
   flagged a legitimate page-to-service recommendation as pointing at
   itself.
4. **A fragile dedup-ordering bug**: the real `research` page has both
   an `explicit` edge to the `blog` product (weight 100) and a
   `sharedKeyword` edge to the same product (weight 40 — the same pair
   `validateKeywords.ts` flags as keyword cannibalization). Deduping
   before ranking meant "the surviving duplicate" depended on which
   edge-construction function happened to run first, not on which one
   actually had the higher weight — found while writing
   `RECOMMENDATION_STRATEGY.md`'s own description of the guarantee and
   realizing it wasn't actually true yet.

All four are fixed; see Architecture Decisions and
`RECOMMENDATION_STRATEGY.md` for each fix's exact reasoning.

## Architecture Decisions

1. **Directory structure follows the task's explicit layout**
   (`builders/`, `graph/`, `ranking/`, `validators/`, `tests/`,
   `documentation/`). No `types/` directory was requested this phase;
   shared types live in `graph/types.ts` since the graph's own shapes
   (nodes, edges, signals, recommendations) are what they describe.

2. **Every builder is a plain function, not a class** — consistent with
   Phase 1.0–1.2's zero-classes precedent and this phase's own "pure,
   deterministic" requirement extended to the graph and ranking layers
   too (see `RELATIONSHIP_GRAPH.md`'s "why not a stateful registry").

3. **RelationshipValidator lives in `src/seo/relationships/validators/`,
   not as new files inside `src/seo/validators/`.** Same reasoning as
   Phase 1.1's `MetadataValidator` and Phase 1.2's `SchemaValidator`:
   reuses Phase 1.0.5's own primitives (`issue`, `makeResult`,
   `findDuplicates` from `validators/shared.ts`) without touching that
   directory, keeping every prior phase's own files byte-for-byte
   unchanged.

4. **Deliberately does NOT re-implement category-parentCategory cycle
   detection.** Phase 1.0.5's `validateRelationships.ts` already owns
   an exhaustive `detectCategoryCycles` check, and this phase's
   governance section says "never duplicate business logic." This
   graph's own edges are various forms of symmetric "relatedTo" — A
   relates to B, B relates to A is the expected shape, not a cycle
   error — so "cyclic errors where inappropriate" is satisfied by
   *not* flagging that expected symmetry, while relying on the
   pre-existing check (exercised by this phase's own "run the
   Validation Engine before/after" quality gate) for the one case
   (category parent hierarchy) where a cycle would genuinely be wrong.

5. **Page-level relationship derivation reuses `generatePageMetadata()`
   only where genuinely needed (none, this phase)** — this platform
   reads `SEOPage`/`SEOProduct`/`SEOService`/`SEOSolution`/`SEOArticle`/
   `SEOCategory` directly from config, since relationships are about
   entity cross-references (ids), not resolved metadata (titles,
   canonical URLs). The architecture diagram's "Metadata Engine ->
   Schema Platform -> Relationship Engine" ordering is honored at the
   *program* level (this phase is built after, and could consume
   metadata/schema output if a future recommendation needed resolved
   URLs), not by importing either engine unnecessarily here.

6. **Ranking is a fixed-weight sum, never a model.** Per this phase's
   explicit "No AI scoring. No probabilistic ranking. Deterministic
   only," `ranking/signals.ts` is a plain `Record<RelationshipSignal, number>`
   constant — no learned weights, no external service, no randomness.
   See `RECOMMENDATION_STRATEGY.md`.

7. **The Registry-equivalent (producer composition) is intentionally
   thinner than Phase 1.2's.** This phase's directory list has no
   `registry/`; the graph itself IS the composed structure (built once
   via `buildRelationshipGraph()`), and the 13 named builders are thin,
   reusable wrappers over one generic traversal function
   (`getRelatedByKind`) rather than a producer-registration system —
   "never duplicate business logic" applied to avoid 13 near-identical
   implementations.

8. **The 12 `RelationshipEntityKind` values are 6 real + 6 reserved.**
   Mirrors `knowledge-graph.config.ts`'s own precedent of reserving
   entity-type slots (`"Documentation"`, `"Download"`,
   `"GitHubRepository"`) ahead of any real data existing for them. See
   `RELATIONSHIP_MAPPING_MATRIX.md` for exactly which of the task's 13
   named builders are real vs. reserved, and why.

## Relationship Platform Architecture

```
src/seo/relationships/
  graph/            types, buildRelationshipGraph(), traversal, recommendationEngine
  ranking/          fixed signal weights, deterministic sort + dedup
  builders/         13 named builders (6 real, 7 reserved) - thin wrappers
  validators/       RelationshipValidator (reuses validators/shared.ts)
  tests/            17 test files, 51 tests
  documentation/    this file + 3 companion documents
  index.ts          top-level public barrel
```

Data flow for one entity: `buildRelationshipGraph()` (built once, from
config) -> `builders/relatedXBuilder.ts` (a named, thin wrapper) ->
`graph/recommendationEngine.ts`'s `generateRecommendationsFor` (resolves
+ types the target) -> `ranking/rankRecommendations.ts` (dedupes,
sorts deterministically) -> `RelationshipRecommendation[]`, independently
re-checked by `validators/relationshipValidator.ts`.

## Graph Design

See `RELATIONSHIP_GRAPH.md` for the full design. Summary: nodes use a
`rel-<kind>-<refId>` id convention (deliberately distinct from Phase
1.2's `<url>#<fragment>` and Phase 1.0's `kg-<kind>-<refId>`); edges are
directed and stored once, with traversal reading both directions
("bidirectional" is a traversal property, not doubled storage); every
edge carries a `signal` (what evidence justified it) alongside its
`type` (what kind of thing is at the other end).

## Ranking Strategy

See `RECOMMENDATION_STRATEGY.md` for the full design. Summary: 8 fixed
signal weights (`explicit: 100` down to `commercialPriority: 20`),
summed per edge, never combined probabilistically; final output sorted
by weight descending with a stable, deterministic tie-break
(`targetId` ascending).

## Files Created

```
src/seo/relationships/
  graph/{types,buildGraph,traversal,recommendationEngine,index}.ts
  ranking/{signals,rankRecommendations,index}.ts
  builders/{relatedProductsBuilder,relatedServicesBuilder,relatedSolutionsBuilder,
            relatedArticlesBuilder,relatedCategoriesBuilder,relatedPagesBuilder,
            relatedResearchBuilder,relatedDownloadsBuilder,relatedDocumentationBuilder,
            relatedLearningBuilder,relatedRepositoriesBuilder,relatedIndustriesBuilder,
            relatedTechnologiesBuilder,reservedRelationshipBuilder,index}.ts
  validators/{relationshipValidator,index}.ts
  tests/{buildGraph,traversal,recommendationEngine,rankRecommendations,
         namedBuilders,reservedBuilders,relationshipValidator}.test.ts + fixtures.ts
  documentation/{RELATIONSHIP_ENGINE,RELATIONSHIP_GRAPH,
                 RELATIONSHIP_MAPPING_MATRIX,RECOMMENDATION_STRATEGY}.md
  index.ts
```

## Files Modified

- `src/seo/index.ts` — added `export * from "./relationships"` (one
  line), completing this file's barrel alongside `types`/`config`/
  `utils`/`validators`/`reports`/`metadata`/`schema`. No other change.

No other file was modified. `about.html`, every other static page,
`App.tsx`, routing, the design system, and every file under
`src/seo/config/`, `src/seo/types/`, `src/seo/utils/`,
`src/seo/validators/`, `src/seo/reports/`, `src/seo/metadata/`, and
`src/seo/schema/` are byte-for-byte unchanged.

## Validation Results

- `validateRelationshipGraph(buildRelationshipGraph())`: **0
  errors** — no self-references, no dangling source/target nodes, no
  duplicate edges, across all 107 real edges.
- `validateRecommendations(recs, graph)` for all 17 real pages: **0
  errors** across 36 total recommendations — every recommendation
  resolves to a real entity, no true self-references, no duplicates.
- Orphan nodes: reported as warnings (not errors), consistent with how
  Phase 1.0.5 treats orphaned pages/unused entities — see Known Risks
  for the real count.
- Category-hierarchy cycles: not re-checked here — see Architecture
  Decision #4; Phase 1.0.5's own `validateRelationships.ts` (re-run as
  this phase's "before/after" quality gate) already confirms 0 cycles.

## Pilot Comparison

Generated by calling `generateAllRecommendationsFor(graph, "page",
"about")`. `about.html` was **not modified** — its real, current
hyperlink structure was read directly from the file.

### Generated Recommendations (about.html)

```json
[]
```

The about page produces **zero** recommendations. This is not a bug —
`seo.config.ts`'s `about` entry has no `relatedEntityIds` at all (the
only real page-level entry that could seed an `explicit` edge), and
`about`'s `primaryKeyword` ("CYBERDUDEBIVASH company") matches nothing
else in the model. Compare: `home` (11 recommendations, seeded by 4
real `relatedEntityIds`), `compliance`/`services`/`threat-intel` (4
each).

### Current Production Experience (about.html)

Real hyperlinks read directly from the file: a hero CTA pair
(`contact.html`, `services.html`), an "ecosystem strip" linking all 4
live products, and a large **shared, sitewide footer** — the exact same
footer block appears near-identically on every static page (already
noted in `docs/audit/SEO_FOUNDATION.md`'s internal-linking finding) —
containing all 6 services, all 4 products again, and 7 more static
pages (`platforms.html`, `about.html` itself, `research.html`,
`pricing.html`, `contact.html`, `privacy.html`, `status.html`), plus
legal links and social profiles.

### Diff Analysis

The current experience and this platform's output answer **different
questions**. The footer is site-wide navigation — "everywhere you can
go from any page" — not a per-page relevance judgment; it's identical
whether the visitor is reading About, Pricing, or a Service page. This
platform instead answers "what does *this specific page* actually
relate to, given the data model" — and for `about.html` specifically,
the honest answer today is "nothing modeled yet," because Phase 1.0
never gave the `about` page entry any `relatedEntityIds`. This is a
content gap in Phase 1.0's config, not an engine defect — the same
class of finding as Phase 1.1/1.2's own pilot comparisons (about.html
has repeatedly been the page with the thinnest data across every
phase's pilot so far). A page like `home` or `compliance`, which DOES
have `relatedEntityIds` populated, gets real, specific, ranked
recommendations that a sitewide footer cannot express (e.g. `home`'s
top recommendation is `ai_hub`/`apex`/`official`/`tools`, all
weight-100 `explicit` matches — the footer treats all of these
identically to every other link on the page).

## Testing Summary

55 new tests across 7 files under `src/seo/relationships/tests/`
(`node:test` + `node:assert/strict`, same convention as every prior
phase):

| Task's testing checklist item | Covered in |
|---|---|
| Graph construction | `buildGraph.test.ts` (node counts, every real signal type, regression cases) |
| Ranking | `rankRecommendations.test.ts` (weight sort, deterministic tie-break, repeatability) |
| Duplicate removal | `rankRecommendations.test.ts` (`dedupeRecommendations`), `relationshipValidator.test.ts` (`RELATIONSHIP_DUPLICATE_EDGE`, `RECOMMENDATION_DUPLICATE`), `recommendationEngine.test.ts` (rank-before-dedup ordering) |
| Relationship traversal | `traversal.test.ts` (bidirectional neighbor lookup, kind filtering) |
| Recommendation generation | `recommendationEngine.test.ts`, `namedBuilders.test.ts`, `reservedBuilders.test.ts` |
| Edge cases | `relationshipValidator.test.ts` (self-reference incl. the `"vciso"` id-collision case, dangling nodes), `reservedBuilders.test.ts` (self-exclusion) |
| Known regressions | `buildGraph.test.ts` (soc/mssp shared product; research/blog + threat-intel/apex shared keyword; home/apps shared product); `relationshipValidator.test.ts` (real graph produces 0 errors); `recommendationEngine.test.ts` (research keeps its explicit, not sharedKeyword, relationship to blog) |

## Verification Results

- `npm install`: clean, `package-lock.json` unchanged, 0 vulnerabilities.
- `npm run lint` (`tsc --noEmit`): **zero errors**, including every new
  file in this phase.
- `npm run build`: succeeds. **Module count identical before and after
  this phase — 2121 modules both times** (verified directly: built
  once with `src/seo/relationships/` stashed out, then again restored).
- Validation + Metadata + Schema + Relationship tests: **187/187
  pass** (24 Phase 1.0.5 + 40 Phase 1.1 + 68 Phase 1.2, all unmodified
  and still green; 55 new Phase 1.3) via `npx tsx --test
  src/seo/validators/__tests__/*.test.ts src/seo/metadata/__tests__/*.test.ts
  src/seo/schema/tests/*.test.ts src/seo/relationships/tests/*.test.ts`.
- `generateValidationReport()` (Phase 1.0.5, fresh run): **0 errors,
  106 warnings, 13 info** — identical to the published baseline.
- `generateAllPageMetadata()` (Phase 1.1, fresh run): 17/17 pages clean.
- `composePageSchemaSet()` + `validatePageSchemaSet()` (Phase 1.2,
  fresh run): 17/17 pages, 81 nodes, 0 errors.
- `buildRelationshipGraph()` + `validateRelationshipGraph()`: 43 nodes,
  107 edges, 0 errors.
- `generateAllRecommendationsFor()` + `validateRecommendations()` for
  all 17 real pages: 36 total recommendations, 0 errors.
- `git status`: only `src/seo/index.ts` modified (one line added) and
  one new directory (`src/seo/relationships/`).

## Known Risks

- **The `"vciso"` page/service id collision (already documented in
  Phase 1.0.5's `SEO_VALIDATION_REPORT.md`) required a real fix in this
  phase**: `RelationshipRecommendation` gained an optional `sourceKind`
  field specifically so the self-reference check can tell two
  different entities sharing an id apart from a true self-reference.
  The underlying collision itself is unresolved (not this phase's data
  to fix) — flagged again here because it now concretely affects a
  second subsystem, not just Phase 1.0.5's own validator.
- **Most orphan nodes are pre-existing, not introduced by this phase**:
  entities Phase 1.0.5 already reports as unreferenced (`blog`
  articles, `iso_tool`/`zt_tool` solutions) remain orphaned in this
  graph too, for the same reason (nothing references them).
- **7 of 13 named builders have no real config backing today**
  (Research, Downloads, Documentation, Learning, Repositories,
  Industries, Technologies) — see `RELATIONSHIP_MAPPING_MATRIX.md` for
  the full, evidenced reasoning per type.
- **`sharedCategory` and `commercialPriority` signals contribute zero
  edges against the real data today** — mechanisms are real and
  tested, but the 3 real blog articles sit in 3 distinct categories,
  and `commercialPriority` is 0%-populated everywhere (Phase 1.0.5's
  own finding). Not a defect in this phase.
- **Only `about.html` (this phase's assigned pilot) was directly
  diffed** against generated output; the other 16 pages' real, current
  in-page link structure wasn't individually compared — a reasonable
  follow-up, not required by this phase's stated pilot scope.

## Recommendations for Phase 1.4

1. **Do not start Phase 1.4 (Commercial SEO) yet** — per this phase's
   own stop condition. Awaiting approval.
2. Populating `businessObjective`/`commercialPriority` (Phase 1.0.5's
   own top recommendation, still open) would immediately activate this
   phase's `commercialPriority` signal — the mechanism is ready and
   tested, waiting only on real data.
3. Resolving the `"vciso"` id collision (rename one of the two
   collections' ids, or add a collection discriminator to
   `relatedEntityIds`) would remove the one case this phase's
   `sourceKind` field exists to work around — worth doing before a
   future phase adds a third or fourth consumer of these ids.
4. If Phase 1.4 or a later phase wants resolved URLs/titles alongside
   recommendations (e.g. to actually render a "related content"
   component), it can call this phase's builders for the entity ids
   and then `generatePageMetadata()`/the Schema Platform's entity
   resolvers (Phase 1.1/1.2) for the display data — this phase
   deliberately returns bare ids and names, not resolved URLs, keeping
   its own output minimal and its dependency on other phases one-way.

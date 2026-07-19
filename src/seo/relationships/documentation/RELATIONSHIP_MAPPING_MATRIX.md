# Relationship Mapping Matrix

Every one of the 13 named builders this phase's instructions list,
whether it's backed by real config data today, and the evidence behind
each decision. See `RELATIONSHIP_ENGINE.md` for the platform-wide
report.

## Config-backed builders (6)

| Builder | Real source | Real edges today |
|---|---|---|
| `buildRelatedProducts` | `PRODUCTS[].relatedServices/relatedSolutions`, `SERVICES[].relatedProducts`, `SOLUTIONS[].relatedProducts`, `PAGES[].relatedEntityIds` | Yes — e.g. `apex` <-> `soc`/`mssp` |
| `buildRelatedServices` | Same fields, service-shaped targets | Yes — e.g. `soc` <-> `mssp` (shared `apex` product) |
| `buildRelatedSolutions` | `PRODUCTS[].relatedSolutions`, `SERVICES[].relatedSolutions`, `SOLUTIONS[].relatedProducts/relatedServices` | Yes — e.g. `owasp` service <-> `ai_tool` solution |
| `buildRelatedArticles` | `BLOG_ARTICLES[].categoryIds` (shared-category signal) | **No** — 3 real articles, 3 distinct categories, zero overlap today (see below) |
| `buildRelatedCategories` | `BLOG_CATEGORIES`/`RESEARCH_CATEGORIES`, `BLOG_ARTICLES[].categoryIds` | Yes — e.g. an article <-> its own category |
| `buildRelatedPages` | `PAGES[].relatedEntityIds` (shared-target signal), shared `primaryKeyword` | Yes — e.g. `home` <-> `apps` (both reference `"tools"`); `home` <-> `threat-intel` (both reference `"apex"`) |

`buildRelatedArticles` is included here rather than in the reserved
table below because its *mechanism* — shared-category detection — is
real and exercised by real config data (`BLOG_CATEGORIES` has 3 real
entries); it simply produces `[]` against today's exact 3 articles
because none of them share a category. This is a content-coverage gap,
not a missing mechanism, the same distinction Phase 1.0.5's own report
draws throughout (e.g. `secondaryKeywords` at 0% coverage — a real gap,
not a broken field).

## Reserved builders (7)

None of these default to any config array — every one requires the
caller to supply candidates directly (see `builders/reservedRelationshipBuilder.ts`).

| Builder | Why reserved | What would need to exist first |
|---|---|---|
| `buildRelatedResearch` | `RESEARCH_ARTICLES` is real but deliberately empty (`research.config.ts`'s own header comment: no durable research-report content exists in this repository yet) | Real `SEOArticle` entries in `RESEARCH_ARTICLES` |
| `buildRelatedDownloads` | `knowledge-graph.config.ts`'s `KnowledgeGraphEntityType` already reserves a `"Download"` slot, but no config file models a real downloadable entity (distinct from `SOLUTIONS`, the real, priced Gumroad kits) | A `downloads.config.ts` (or equivalent) with real download entities |
| `buildRelatedDocumentation` | `KnowledgeGraphEntityType` reserves `"Documentation"`; the markdown under `docs/` is this program's own internal process record, not a user-facing SEO content entity | Real, user-facing documentation modeled as SEO content |
| `buildRelatedLearning` | Phase 1.0's `InternalLinkRelationType` already reserves `"relatedLearning"`; no config models course/learning content distinctly from `SOLUTIONS`' guide/toolkit formats | Real course/learning entities |
| `buildRelatedRepositories` | `KnowledgeGraphEntityType` reserves `"GitHubRepository"`; no config models any real repository | A repositories config with real GitHub project data |
| `buildRelatedIndustries` | No `SEOIndustry` type or industries config exists anywhere (`SEOProduct.audience` is roles/personas — "SOC Analysts," "MSSPs" — not industries) | An industries taxonomy, added deliberately, not inferred here |
| `buildRelatedTechnologies` | No `SEOTechnology` type or technologies config exists anywhere | A technologies taxonomy, added deliberately, not inferred here |

Each reserved builder is still a real, tested, reusable function — it
just has nothing real to call with by default, consistent with this
program's established rule (Phase 1.2's `FAQBuilder`/`SearchActionBuilder`
precedent): build the capability, don't fabricate the data it would
need.

## Product vs. SoftwareApplication vs. this phase's "Related Products"

Phase 1.2's `SCHEMA_MAPPING_MATRIX.md` maps `PRODUCTS` (the 5 live
platform/subdomains) to schema.org `SoftwareApplication` and `SOLUTIONS`
(the 5 priced kits) to schema.org `Product`. This phase's
`buildRelatedProducts` builder is named after the **data-model
collection** (`PRODUCTS`), not the schema.org type — it recommends
`PRODUCTS` entries specifically (Sentinel APEX, AI Security Hub,
ThreatCore Tools, the Research Blog, the official gateway), while
`buildRelatedSolutions` covers the `SOLUTIONS` collection. This is a
naming correspondence worth stating explicitly since the two phases use
"Product" to mean different things for different, good reasons — Phase
1.2 cares about schema.org semantics; this phase cares about which
config collection a relationship points into.

## The `"vciso"` collision, revisited

`SERVICES` and `PAGES` both use `"vciso"` as a real id (Phase 1.0.5's
own documented finding). This phase's graph resolves `"vciso"`
references correctly (the `vciso` page's own `relatedEntityIds: ["vciso"]`
resolves to the `vciso` *service*, matching Phase 1.0.5's verified
intent) — but it also means a recommendation's bare `targetId: "vciso"`
is ambiguous without also checking `targetKind`/`sourceKind`. Every
consumer of this platform's output should treat `(kind, refId)` — not
`refId` alone — as an entity's true identity, exactly as this
platform's own `RelationshipRecommendation.sourceKind`/`targetKind`
fields are designed to let it.

## Extending this matrix

Moving a builder from "reserved" to "config-backed": add the real
config array, add the entity kind to `RelationshipEntityKind` if it
isn't already one of the 6 reserved slots (it likely already is — see
`RELATIONSHIP_GRAPH.md`), add node construction and any relevant
edge-building pass to `graph/buildGraph.ts`, and change the builder in
`builders/` to default to the new real array the way
`relatedResearchBuilder.ts` already defaults to `RESEARCH_ARTICLES`
(real today, just empty) rather than requiring an explicit parameter.

# Recommendation Strategy

Deep dive on `src/seo/relationships/ranking/`. See `RELATIONSHIP_ENGINE.md`
for the platform-wide report.

## Deterministic only

Per this phase's explicit instruction — "No AI scoring. No
probabilistic ranking. Deterministic only" — ranking is a fixed lookup
table summed per edge, nothing more:

```ts
export const SIGNAL_WEIGHTS: Record<RelationshipSignal, number> = {
  explicit: 100,
  sharedProduct: 50,
  sharedService: 50,
  sharedKeyword: 40,
  sharedCategory: 35,
  sharedIndustry: 30,
  sharedTechnology: 30,
  commercialPriority: 20,
};
```

No clock, no random source, no external service, no machine-learned
weight is read anywhere in `ranking/`. The same graph always produces
the same ranked output.

## Why this ordering

| Signal | Weight | Why |
|---|---|---|
| `explicit` | 100 | An authored, deliberate cross-reference (`relatedProducts`, `relatedEntityIds`, etc.) — the strongest possible evidence, since a person or a prior phase's data entry actually asserted this relationship. |
| `sharedProduct` / `sharedService` | 50 | Two entities both pointing at the same third entity is a real, structural relationship already present in the data model's own foreign-key fields — not a text-equality coincidence, but not as strong as a direct, authored link between the two entities themselves. |
| `sharedKeyword` | 40 | Exact `primaryKeyword` equality is meaningful, but it's also exactly what Phase 1.0.5's `validateKeywords.ts` flags as **keyword cannibalization** — two entities competing for the same search intent rather than a content association. Ranked below the structural signals deliberately: it's real evidence, but of a different, slightly less certain kind. |
| `sharedCategory` | 35 | A real taxonomic relationship (two articles filed under the same topic) — weighted below keyword sharing because a category is coarser-grained than an exact keyword match. |
| `sharedIndustry` / `sharedTechnology` | 30 | Reserved — no real data exists to compute these today (see `RELATIONSHIP_MAPPING_MATRIX.md`), but a weight is defined now so activating them later needs no design decision, only real data. |
| `commercialPriority` | 20 | The weakest signal: a coarse equality match (e.g. both entities marked `"high"` priority) says nothing about topical relevance, only that both are commercially important. Lowest of the populated-mechanism signals for exactly that reason. |

## What the real data actually populates

Checked directly against the committed config (not assumed):

| Signal | Real edges today | Evidence |
|---|---|---|
| `explicit` | 37 | Every `relatedProducts`/`relatedServices`/`relatedSolutions`/`relatedEntityIds`/`categoryIds` reference in the model |
| `sharedService` | 42 | Products/pages that reference the same service (post-dedup fix — see `RELATIONSHIP_GRAPH.md`) |
| `sharedProduct` | 24 | e.g. `soc` <-> `mssp` services (both reference `apex`); `home` <-> `apps` pages (both reference `tools`) |
| `sharedKeyword` | 4 | The 2 real keyword-cannibalization pairs (`research` <-> `blog`, `threat-intel` <-> `apex`), each producing edges in both directions |
| `sharedCategory` | 0 | 3 real blog articles, 3 distinct categories — no overlap today |
| `commercialPriority` | 0 | 0% field coverage across the entire model (Phase 1.0.5's own finding) |
| `sharedIndustry` / `sharedTechnology` | 0 (not computed) | No config data exists to compute equality over at all |

43 nodes, 107 edges total. This honest, evidenced breakdown — rather
than an assumed even distribution across all 8 signals — is itself a
useful finding: two-thirds of this phase's *designed* signal space
(`sharedCategory`, `commercialPriority`, `sharedIndustry`,
`sharedTechnology` — 4 of 8) currently contributes nothing, for the
same class of reason Phase 1.0.5's report already surfaced for several
data-model fields (real mechanism, unpopulated data).

## Ranking and deduplication order: rank first, then dedupe, then limit

```ts
rankRecommendations(recommendations)      // sort by weight desc, then targetId asc — no limit yet
dedupeRecommendations(ranked)             // keep the first per (targetId, relationType)
deduped.slice(0, limit)                   // bound the final list, if requested
```

`graph/recommendationEngine.ts`'s internal `finalize()` helper runs
these in exactly this order, deliberately. The real data has a case
that makes the order matter: the `research` page has **both** an
`explicit` edge to the `blog` product (weight 100 — `research.config.ts`'s
own `relatedEntityIds: ["blog"]`) **and** a `sharedKeyword` edge to the
same product (weight 40 — the real keyword-cannibalization pair
`validateKeywords.ts` already flags). `dedupeRecommendations`'s key
(`targetId` + `relationType`) doesn't distinguish these two edges, so
whichever one is "first" when dedup runs is the one that survives.
Ranking first guarantees "first" means "highest weight" — a real
property of this pipeline, not an accident of which
`buildXEdges()` function in `graph/buildGraph.ts` happens to run
first. `tests/recommendationEngine.test.ts` locks this down twice: a
synthetic case with edges deliberately inserted lowest-weight-first,
and a regression test against the real `research` -> `blog`
relationship specifically.

## No per-recommendation limit by default

Every builder's `limit` parameter is optional and unset by default —
this phase does not decide "top 3" or "top 5" for a consumer; that's a
presentation decision for whatever future phase actually renders these
recommendations (explicitly out of scope here — see
`RELATIONSHIP_ENGINE.md`'s "Do NOT generate HTML" instruction). A
caller who wants a bounded list passes `limit` explicitly.

## Extending the ranking strategy

Adding a 9th signal: add it to `RelationshipSignal` (`graph/types.ts`),
add its weight to `SIGNAL_WEIGHTS` with a comment explaining where it
sits relative to the existing 8 and why (matching this document's own
"why this ordering" table), and add the edge-construction logic to
`graph/buildGraph.ts`. Never introduce a weight that depends on
run-time state (a timestamp, a request context, a random seed) — every
weight in this system must be reproducible from the committed config
alone.

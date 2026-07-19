# Relationship Graph

Deep dive on `src/seo/relationships/graph/`. See `RELATIONSHIP_ENGINE.md`
for the platform-wide report this document is referenced from.

## Shape

```ts
interface RelationshipNode { id: string; kind: RelationshipEntityKind; refId: string; name: string; }
interface RelationshipEdge { from: string; to: string; type: RelationshipType; signal: RelationshipSignal; weight: number; }
interface RelationshipGraph { nodes: RelationshipNode[]; edges: RelationshipEdge[]; }
```

Plain arrays, not a `Map`-backed or class-based structure — matching
`knowledge-graph.config.ts`'s own `KnowledgeGraphEntity[]`/
`KnowledgeGraphRelationship[]` convention (Phase 1.0). JSON-serializable,
trivial to snapshot in a test with `assert.deepEqual`, and — per this
phase's "the graph must be deterministic" requirement — built fresh
each call from config, with no hidden mutable state to leak between
calls or tests.

## Node identity: `rel-<kind>-<refId>`

Three different graph-like structures now exist in this codebase, each
solving a different problem, each with its own id convention:

| Structure | Phase | Id convention | Purpose |
|---|---|---|---|
| Knowledge Graph | 1.0 | `kg-<kind>-<refId>` | Entities + relationships, no JSON-LD |
| Schema `@id` | 1.2 | `<absolute-url>#<fragment>` | Real schema.org node identity |
| Relationship Graph | 1.3 | `rel-<kind>-<refId>` | Internal-link recommendation graph |

Keeping this graph's prefix distinct from the other two is deliberate —
nothing about the Relationship Graph implies these ids are meant to
resolve as URLs or appear in JSON-LD; they're this platform's own,
internal addressing scheme only.

## Edges are directed and stored once

`RelationshipEdge.from`/`.to` express a direction, but "bidirectional
links" (this phase's own requirement) is a property of **traversal**,
not storage: `graph/traversal.ts`'s `getNeighbors(graph, id)` finds
every edge where `id` is *either* `from` or `to`. This avoids storing
the same relationship twice (once each direction) for symmetric cases,
while still fully supporting "walk from either side."

The one place direction genuinely matters is `relationType`: an edge's
`type` field describes the kind of thing at whichever end is being
asked about, not a fixed property of the edge itself. `graph/recommendationEngine.ts`
derives `relationType` from the **resolved neighbor's own kind**
(`typeForKind(related.node.kind)`), never by reading `edge.type`
directly — a real bug this phase's own tests caught (see
`RELATIONSHIP_ENGINE.md`'s Executive Summary, bug #2): reading
`edge.type` unchanged when traversing backward described the *source's*
kind instead of the actual neighbor's.

## Construction: two passes over the same explicit references

`graph/buildGraph.ts`'s `collectExplicitRefs()` gathers every real
`relatedProducts`/`relatedServices`/`relatedSolutions`/`relatedEntityIds`/
`categoryIds` reference in the config into one flat list, each tagged
with its source's own kind. Everything else derives from that one list:

1. **Direct explicit edges** — one edge per reference, weight
   `SIGNAL_WEIGHTS.explicit`.
2. **Shared-target edges** — any two *different* sources referencing
   the *same* product or service are related to each other through it
   (e.g. `services.config.ts`'s `"soc"` and `"mssp"` both list
   `relatedProducts: ["apex"]`). Deduped by `(from, to, signal)` after
   grouping — two sources sharing *two* targets in common would
   otherwise produce the same edge twice, a second real bug this
   phase's tests caught (Executive Summary, bug #1).

Two further signals are computed independently of `collectExplicitRefs()`,
since they don't derive from a foreign-key-style reference:

3. **Shared-keyword edges** — exact `primaryKeyword` equality across
   pages/products/services/solutions/articles. The same real
   relationship Phase 1.0.5's `validateKeywords.ts` reports as
   `KEYWORD_CANNIBALIZATION` (2 real pairs: `research` page <->
   `blog` product; `threat-intel` page <-> `apex` product) — the same
   evidence, read here as a candidate relationship instead of only a
   problem to fix.
4. **Commercial-priority edges** — equality of a non-empty
   `commercialPriority` value. Real mechanism, zero edges today (0%
   field coverage — Phase 1.0.5's own finding).

`sharedCategory` edges (articles sharing a `categoryIds` entry) are
computed similarly but scoped to articles only, since that's the one
entity type in this data model with a real, populated category
association today.

## What this graph deliberately does not model

- **Category parent-hierarchy edges** (`SEOCategory.parentCategory`) —
  Phase 1.0.5's `validateRelationships.ts` already owns cycle-checking
  that relationship exhaustively; duplicating it here would be exactly
  the "duplicate business logic" this phase's governance section warns
  against. No category in the real data sets `parentCategory` today
  anyway (0 real edges either way).
- **Industry/technology edges** — no config data exists to compute
  equality over (see `RELATIONSHIP_MAPPING_MATRIX.md`).
- **Solution-to-solution "shared target" edges** — checked against the
  real data: every solution is referenced by at most one other entity,
  so this case never actually occurs; scoping `buildSharedTargetEdges`
  to product/service targets only (the two signals this phase actually
  names) costs nothing in practice.

## Traversal API

```ts
resolveNode(graph, id): RelationshipNode | undefined
getNeighborEdges(graph, id): RelationshipEdge[]        // both directions
getNeighbors(graph, id): { node, edge }[]               // resolved, both directions
getRelatedByKind(graph, kind, refId, targetKind): { node, edge }[]  // filtered by target kind
```

Every named builder in `builders/` calls `getRelatedByKind` through
`graph/recommendationEngine.ts`'s `generateRecommendationsFor` — none
re-implements its own graph walk.

## Extension strategy

Adding a new signal: add it to `RelationshipSignal` (`graph/types.ts`),
give it a weight in `ranking/signals.ts`, and add a `buildXEdges()`
function in `buildGraph.ts` that's included in `buildRelationshipGraph()`'s
returned edge list. Adding a new entity kind with real config backing:
add it to `RelationshipEntityKind`, add its nodes to `buildNodes()`, add
whichever edge-construction passes apply, and add a named builder in
`builders/` per `RELATIONSHIP_MAPPING_MATRIX.md`'s existing pattern.

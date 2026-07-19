import { nodeId, typeForKind } from "./buildGraph";
import { getNeighbors, getRelatedByKind, type RelatedNode } from "./traversal";
import { rankRecommendations, dedupeRecommendations } from "../ranking/rankRecommendations";
import type { RelationshipGraph, RelationshipEntityKind, RelationshipRecommendation } from "./types";

// Converts graph edges into the platform's public output shape
// (RelationshipRecommendation) and applies ranking/dedup — the "graph
// traversal -> future recommendations" step named in this phase's
// GRAPH MODEL section. Produces strongly typed data only; never HTML,
// never a rendered component.

/**
 * `relationType` is derived from `related.node.kind` (the resolved
 * neighbor's own real kind), never read directly off
 * `related.edge.type`. Edges are directed and stored once (see
 * types.ts), so `edge.type` describes the target's kind only for the
 * direction the edge was originally built in — getNeighbors() walks
 * edges from *either* side (that's what "bidirectional" traversal
 * means here), and reusing `edge.type` unchanged when walking the
 * reverse direction would describe the *source's* kind instead of the
 * actual neighbor's. Deriving from the resolved node instead is correct
 * regardless of which direction produced the edge.
 */
function toRecommendation(sourceRefId: string, sourceKind: RelationshipEntityKind, related: RelatedNode): RelationshipRecommendation {
  return {
    sourceId: sourceRefId,
    sourceKind,
    targetId: related.node.refId,
    targetKind: related.node.kind,
    relationType: typeForKind(related.node.kind),
    signal: related.edge.signal,
    weight: related.edge.weight,
    anchorText: related.node.name,
  };
}

/**
 * Ranks (sorts by weight, no limit yet) BEFORE deduping, then applies
 * `limit` last. Order matters: `dedupeRecommendations` keeps the first
 * occurrence per (targetId, relationType), and the real data has cases
 * where the same target is reachable via two different signals at two
 * different weights — e.g. the "research" page -> "blog" product has
 * both an `explicit` edge (weight 100) and a `sharedKeyword` edge
 * (weight 40, the same pair Phase 1.0.5's validateKeywords.ts flags as
 * keyword cannibalization). Deduping first would keep whichever one
 * happened to be built first (today, explicit — but only because of
 * buildRelationshipGraph()'s own function-call order, not a real
 * guarantee); ranking first makes "keep the highest-weight duplicate"
 * an actual property of this pipeline instead of a coincidence of
 * construction order. Applying `limit` only after both steps ensures
 * it bounds the final, deduped list rather than the raw one.
 */
function finalize(recommendations: readonly RelationshipRecommendation[], limit: number | undefined): RelationshipRecommendation[] {
  const deduped = dedupeRecommendations(rankRecommendations(recommendations));
  return limit !== undefined ? deduped.slice(0, limit) : deduped;
}

/** Every recommendation of one specific target kind for a given entity — what each named builder in builders/ calls. */
export function generateRecommendationsFor(
  graph: RelationshipGraph,
  kind: RelationshipEntityKind,
  refId: string,
  targetKind: RelationshipEntityKind,
  limit?: number,
): RelationshipRecommendation[] {
  const recommendations = getRelatedByKind(graph, kind, refId, targetKind).map((related) => toRecommendation(refId, kind, related));
  return finalize(recommendations, limit);
}

/** Every recommendation for a given entity, of any target kind. */
export function generateAllRecommendationsFor(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, limit?: number): RelationshipRecommendation[] {
  const recommendations = getNeighbors(graph, nodeId(kind, refId)).map((related) => toRecommendation(refId, kind, related));
  return finalize(recommendations, limit);
}

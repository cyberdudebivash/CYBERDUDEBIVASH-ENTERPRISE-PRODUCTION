import { nodeId } from "./buildGraph";
import type { RelationshipGraph, RelationshipNode, RelationshipEdge, RelationshipEntityKind } from "./types";

// Generic graph traversal — kind-agnostic. Every named builder in
// builders/ delegates to getRelatedByKind() rather than re-implementing
// its own lookup, so "related products" and "related services" differ
// only in which targetKind they pass, not in how the graph is walked.

export function resolveNode(graph: RelationshipGraph, id: string): RelationshipNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** Every edge touching `id`, from either side — "bidirectional" is a property of how this reads the graph, not of how edges are stored (see types.ts's header comment: edges are directed and stored once). */
export function getNeighborEdges(graph: RelationshipGraph, id: string): RelationshipEdge[] {
  return graph.edges.filter((edge) => edge.from === id || edge.to === id);
}

function otherSide(edge: RelationshipEdge, id: string): string {
  return edge.from === id ? edge.to : edge.from;
}

export interface RelatedNode {
  node: RelationshipNode;
  edge: RelationshipEdge;
}

/** Every node related to `id`, in any direction, regardless of kind — each paired with the edge that connects them. */
export function getNeighbors(graph: RelationshipGraph, id: string): RelatedNode[] {
  const results: RelatedNode[] = [];
  for (const edge of getNeighborEdges(graph, id)) {
    const node = resolveNode(graph, otherSide(edge, id));
    if (node) results.push({ node, edge });
  }
  return results;
}

/** The core lookup every builders/relatedXBuilder.ts wraps: every node of `targetKind` related to (kind, refId). */
export function getRelatedByKind(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, targetKind: RelationshipEntityKind): RelatedNode[] {
  return getNeighbors(graph, nodeId(kind, refId)).filter(({ node }) => node.kind === targetKind);
}

import type { RelationshipGraph, RelationshipNode, RelationshipEdge } from "../graph/types";

// Shared synthetic fixtures for this platform's test suite — not a
// `.test.ts` file itself, so the test runner never executes it
// directly. Small, hand-built graphs for testing structural properties
// (self-reference, dangling nodes, duplicates) that don't naturally
// occur in the real, already-validated config data — real-data tests
// use buildRelationshipGraph() directly instead (see regression.test.ts).

export function makeNode(overrides: Partial<RelationshipNode> = {}): RelationshipNode {
  return { id: "rel-page-a", kind: "page", refId: "a", name: "Page A", ...overrides };
}

export function makeEdge(overrides: Partial<RelationshipEdge> = {}): RelationshipEdge {
  return { from: "rel-page-a", to: "rel-page-b", type: "relatedPage", signal: "explicit", weight: 100, ...overrides };
}

export function makeGraph(overrides: Partial<RelationshipGraph> = {}): RelationshipGraph {
  return {
    nodes: [makeNode({ id: "rel-page-a", refId: "a", name: "Page A" }), makeNode({ id: "rel-page-b", refId: "b", name: "Page B" })],
    edges: [makeEdge()],
    ...overrides,
  };
}

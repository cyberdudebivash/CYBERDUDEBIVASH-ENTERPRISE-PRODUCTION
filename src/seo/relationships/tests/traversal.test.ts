import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveNode, getNeighborEdges, getNeighbors, getRelatedByKind } from "../graph/traversal";
import { makeGraph, makeNode, makeEdge } from "./fixtures";

test("resolveNode: finds a node by id", () => {
  const graph = makeGraph();
  assert.equal(resolveNode(graph, "rel-page-a")?.name, "Page A");
});

test("resolveNode: returns undefined for an unknown id", () => {
  assert.equal(resolveNode(makeGraph(), "rel-page-does-not-exist"), undefined);
});

test("getNeighborEdges: finds edges touching a node from either side (bidirectional traversal over a directed edge)", () => {
  const graph = makeGraph({ edges: [makeEdge({ from: "rel-page-a", to: "rel-page-b" })] });
  assert.equal(getNeighborEdges(graph, "rel-page-a").length, 1);
  assert.equal(getNeighborEdges(graph, "rel-page-b").length, 1);
});

test("getNeighbors: resolves the node on the other side of each edge, whichever direction it's stored in", () => {
  const graph = makeGraph({
    nodes: [makeNode({ id: "rel-page-a", refId: "a" }), makeNode({ id: "rel-page-b", refId: "b", name: "Page B" })],
    edges: [makeEdge({ from: "rel-page-b", to: "rel-page-a" })],
  });
  const neighbors = getNeighbors(graph, "rel-page-a");
  assert.equal(neighbors.length, 1);
  assert.equal(neighbors[0].node.name, "Page B");
});

test("getRelatedByKind: filters neighbors down to a specific target kind", () => {
  const graph: ReturnType<typeof makeGraph> = {
    nodes: [
      makeNode({ id: "rel-page-a", refId: "a", kind: "page" }),
      makeNode({ id: "rel-product-x", refId: "x", kind: "product", name: "Product X" }),
      makeNode({ id: "rel-service-y", refId: "y", kind: "service", name: "Service Y" }),
    ],
    edges: [makeEdge({ from: "rel-page-a", to: "rel-product-x" }), makeEdge({ from: "rel-page-a", to: "rel-service-y" })],
  };
  const products = getRelatedByKind(graph, "page", "a", "product");
  assert.equal(products.length, 1);
  assert.equal(products[0].node.name, "Product X");
});

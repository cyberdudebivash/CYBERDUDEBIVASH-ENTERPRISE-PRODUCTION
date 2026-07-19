import { test } from "node:test";
import assert from "node:assert/strict";
import { generateRecommendationsFor, generateAllRecommendationsFor } from "../graph/recommendationEngine";
import { buildRelationshipGraph } from "../graph/buildGraph";
import { makeGraph, makeNode, makeEdge } from "./fixtures";

test("generateRecommendationsFor: converts an edge and its target node into a typed recommendation", () => {
  const graph = makeGraph();
  const recs = generateRecommendationsFor(graph, "page", "a", "page");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].sourceId, "a");
  assert.equal(recs[0].targetId, "b");
  assert.equal(recs[0].anchorText, "Page B");
  assert.equal(recs[0].weight, 100);
});

test("generateRecommendationsFor: returns [] when no edge matches the requested target kind", () => {
  const graph = makeGraph();
  assert.deepEqual(generateRecommendationsFor(graph, "page", "a", "product"), []);
});

test("generateRecommendationsFor: respects a limit", () => {
  const graph = makeGraph({
    nodes: [makeNode({ id: "rel-page-a", refId: "a" }), makeNode({ id: "rel-page-b", refId: "b" }), makeNode({ id: "rel-page-c", refId: "c", name: "Page C" })],
    edges: [makeEdge({ from: "rel-page-a", to: "rel-page-b", weight: 50 }), makeEdge({ from: "rel-page-a", to: "rel-page-c", weight: 90 })],
  });
  const recs = generateRecommendationsFor(graph, "page", "a", "page", 1);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].targetId, "c");
});

test("generateAllRecommendationsFor: includes every target kind, ranked by weight", () => {
  const graph = makeGraph({
    nodes: [
      makeNode({ id: "rel-page-a", refId: "a" }),
      makeNode({ id: "rel-product-x", refId: "x", kind: "product", name: "Product X" }),
      makeNode({ id: "rel-page-b", refId: "b", name: "Page B" }),
    ],
    edges: [makeEdge({ from: "rel-page-a", to: "rel-page-b", weight: 40 }), makeEdge({ from: "rel-page-a", to: "rel-product-x", weight: 90, type: "relatedProduct" })],
  });
  const recs = generateAllRecommendationsFor(graph, "page", "a");
  assert.equal(recs.length, 2);
  assert.equal(recs[0].targetId, "x");
  assert.equal(recs[1].targetId, "b");
});

test("generateRecommendationsFor: when the same target is reachable via two signals at different weights, keeps the higher-weight one regardless of edge order", () => {
  // Same scenario as the real research->blog pair (explicit weight 100
  // vs sharedKeyword weight 40 to the same product), but with edges
  // deliberately inserted lowest-weight-first to prove this doesn't
  // depend on construction order.
  const graph = makeGraph({
    nodes: [makeNode({ id: "rel-page-a", refId: "a" }), makeNode({ id: "rel-product-x", refId: "x", kind: "product", name: "Product X" })],
    edges: [
      makeEdge({ from: "rel-page-a", to: "rel-product-x", type: "relatedProduct", signal: "sharedKeyword", weight: 40 }),
      makeEdge({ from: "rel-page-a", to: "rel-product-x", type: "relatedProduct", signal: "explicit", weight: 100 }),
    ],
  });
  const recs = generateRecommendationsFor(graph, "page", "a", "product");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].signal, "explicit");
  assert.equal(recs[0].weight, 100);
});

test("regression — the real research page keeps its explicit (weight 100) relationship to the blog product, not the lower-weight sharedKeyword duplicate", () => {
  const graph = buildRelationshipGraph();
  const recs = generateRecommendationsFor(graph, "page", "research", "product");
  const blog = recs.find((r) => r.targetId === "blog");
  assert.ok(blog);
  assert.equal(blog?.signal, "explicit");
  assert.equal(blog?.weight, 100);
});

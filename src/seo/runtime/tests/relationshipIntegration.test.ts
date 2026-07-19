import { test } from "node:test";
import assert from "node:assert/strict";
import { buildValidatedRelationshipGraph, integrateRelationships } from "../integration/relationshipIntegration";
import { generateAllRecommendationsFor } from "../../relationships";
import { PAGES } from "../../config";

test("buildValidatedRelationshipGraph: matches Phase 1.3's real graph shape (43 nodes / 107 edges)", () => {
  const graph = buildValidatedRelationshipGraph();
  assert.equal(graph.nodes.length, 43);
  assert.equal(graph.edges.length, 107);
});

test("integrateRelationships: matches Phase 1.3's own generateAllRecommendationsFor output exactly, for every page", () => {
  const graph = buildValidatedRelationshipGraph();
  for (const page of PAGES) {
    assert.deepEqual(integrateRelationships(page.id, graph), generateAllRecommendationsFor(graph, "page", page.id));
  }
});

test("integrateRelationships: the 'home' page (the one real page with populated relatedEntityIds) returns recommendations", () => {
  const graph = buildValidatedRelationshipGraph();
  assert.ok(integrateRelationships("home", graph).length > 0);
});

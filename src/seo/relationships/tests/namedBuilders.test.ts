import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRelationshipGraph } from "../graph/buildGraph";
import {
  buildRelatedProducts,
  buildRelatedServices,
  buildRelatedSolutions,
  buildRelatedArticles,
  buildRelatedCategories,
  buildRelatedPages,
} from "../builders";

// The 6 config-backed named builders, exercised against the real graph
// — each is a thin wrapper around graph/recommendationEngine.ts's
// generic lookup, so these tests confirm the wrapping (right target
// kind), not the underlying traversal logic (already covered by
// traversal.test.ts/recommendationEngine.test.ts).

const graph = buildRelationshipGraph();

test("buildRelatedProducts: soc service recommends its related product (apex)", () => {
  const recs = buildRelatedProducts(graph, "service", "soc");
  assert.ok(recs.some((r) => r.targetId === "apex"));
  assert.ok(recs.every((r) => r.targetKind === "product"));
});

test("buildRelatedServices: mssp is recommended for soc via the shared apex product", () => {
  const recs = buildRelatedServices(graph, "service", "soc");
  assert.ok(recs.some((r) => r.targetId === "mssp" && r.signal === "sharedProduct"));
});

test("buildRelatedSolutions: the owasp service recommends its related solution (ai_tool)", () => {
  const recs = buildRelatedSolutions(graph, "service", "owasp");
  assert.ok(recs.some((r) => r.targetId === "ai_tool"));
});

test("buildRelatedArticles: returns [] for a page with no article relationship (honest zero, not an error)", () => {
  const recs = buildRelatedArticles(graph, "page", "research");
  assert.deepEqual(recs, []);
});

test("buildRelatedCategories: the dirtyclone article recommends its own category", () => {
  const recs = buildRelatedCategories(graph, "article", "dirtyclone-cve-2026-43503");
  assert.ok(recs.some((r) => r.targetId === "kernel-exploits"));
});

test("buildRelatedPages: the home page recommends the apps page via their shared \"tools\" reference", () => {
  const recs = buildRelatedPages(graph, "page", "home");
  assert.ok(recs.some((r) => r.targetId === "apps" && r.signal === "sharedProduct"));
});

test("buildRelatedPages: the about page has no page-level recommendations today (no relatedEntityIds, no shared keyword with another page)", () => {
  const recs = buildRelatedPages(graph, "page", "about");
  assert.deepEqual(recs, []);
});

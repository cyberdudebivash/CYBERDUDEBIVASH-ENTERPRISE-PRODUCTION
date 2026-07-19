import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRelationshipGraph, nodeId, typeForKind } from "../graph/buildGraph";
import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, BLOG_ARTICLES, BLOG_CATEGORIES, RESEARCH_CATEGORIES } from "../../config";

test("nodeId: uses the rel-<kind>-<refId> convention", () => {
  assert.equal(nodeId("product", "apex"), "rel-product-apex");
});

test("typeForKind: is exhaustive and maps every kind to a distinct relationship type", () => {
  assert.equal(typeForKind("product"), "relatedProduct");
  assert.equal(typeForKind("download"), "relatedDownload");
  assert.equal(typeForKind("industry"), "relatedIndustry");
});

test("buildRelationshipGraph: constructs one node per real page/product/service/solution/article/category", () => {
  const graph = buildRelationshipGraph();
  const expectedCount = PAGES.length + PRODUCTS.length + SERVICES.length + SOLUTIONS.length + BLOG_ARTICLES.length + BLOG_CATEGORIES.length + RESEARCH_CATEGORIES.length;
  assert.equal(graph.nodes.length, expectedCount);
});

test("buildRelationshipGraph: regression — soc and mssp services are connected via sharedProduct (both relatedProducts: [\"apex\"])", () => {
  const graph = buildRelationshipGraph();
  const found = graph.edges.find((e) => e.from === nodeId("service", "soc") && e.to === nodeId("service", "mssp") && e.signal === "sharedProduct");
  assert.ok(found, "expected a sharedProduct edge from soc to mssp");
  assert.equal(found?.type, "relatedService");
});

test("buildRelationshipGraph: regression — keyword cannibalization pairs become sharedKeyword edges (research page <-> blog product, threat-intel page <-> apex product)", () => {
  const graph = buildRelationshipGraph();
  const researchToBlog = graph.edges.find((e) => e.from === nodeId("page", "research") && e.to === nodeId("product", "blog") && e.signal === "sharedKeyword");
  const threatIntelToApex = graph.edges.find((e) => e.from === nodeId("page", "threat-intel") && e.to === nodeId("product", "apex") && e.signal === "sharedKeyword");
  assert.ok(researchToBlog, "expected a sharedKeyword edge from the research page to the blog product");
  assert.ok(threatIntelToApex, "expected a sharedKeyword edge from the threat-intel page to the apex product");
});

test("buildRelationshipGraph: regression — home and apps pages are connected via shared relatedEntityIds (\"tools\")", () => {
  const graph = buildRelationshipGraph();
  const found = graph.edges.find((e) => e.from === nodeId("page", "home") && e.to === nodeId("page", "apps"));
  assert.ok(found, "expected home and apps to be related through their shared reference to the \"tools\" product");
});

test("buildRelationshipGraph: regression — the about page has no explicit relatedEntityIds and produces no explicit-signal edges", () => {
  const graph = buildRelationshipGraph();
  const explicitFromAbout = graph.edges.filter((e) => e.from === nodeId("page", "about") && e.signal === "explicit");
  assert.deepEqual(explicitFromAbout, []);
});

test("buildRelationshipGraph: sharedCategory edges are currently empty (the 3 real blog articles each sit in a distinct category)", () => {
  const graph = buildRelationshipGraph();
  assert.deepEqual(graph.edges.filter((e) => e.signal === "sharedCategory"), []);
});

test("buildRelationshipGraph: commercialPriority edges are currently empty (0% field coverage across the real data model)", () => {
  const graph = buildRelationshipGraph();
  assert.deepEqual(graph.edges.filter((e) => e.signal === "commercialPriority"), []);
});

test("buildRelationshipGraph: every edge resolves to a real node (no dangling references)", () => {
  const graph = buildRelationshipGraph();
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const edge of graph.edges) {
    assert.ok(nodeIds.has(edge.from), `dangling source: ${edge.from}`);
    assert.ok(nodeIds.has(edge.to), `dangling target: ${edge.to}`);
  }
});

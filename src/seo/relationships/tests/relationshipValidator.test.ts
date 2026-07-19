import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRelationshipGraph, validateRecommendations } from "../validators/relationshipValidator";
import { buildRelationshipGraph } from "../graph/buildGraph";
import { makeGraph, makeNode, makeEdge } from "./fixtures";
import type { ValidationIssue } from "../../validators/shared";
import type { RelationshipRecommendation } from "../graph/types";

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue | undefined {
  return issues.find((i) => i.code === code);
}

test("validateRelationshipGraph: a well-formed graph produces no errors", () => {
  const errors = validateRelationshipGraph(makeGraph()).issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, []);
});

test("validateRelationshipGraph: flags a self-referencing edge", () => {
  const graph = makeGraph({ edges: [makeEdge({ from: "rel-page-a", to: "rel-page-a" })] });
  const found = findIssue(validateRelationshipGraph(graph).issues, "RELATIONSHIP_SELF_REFERENCE");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateRelationshipGraph: flags a dangling source and a dangling target", () => {
  const graph = makeGraph({ edges: [makeEdge({ from: "rel-page-ghost", to: "rel-page-b" })] });
  const issues = validateRelationshipGraph(graph).issues;
  assert.ok(findIssue(issues, "RELATIONSHIP_DANGLING_SOURCE"));
});

test("validateRelationshipGraph: flags a duplicate edge", () => {
  const graph = makeGraph({ edges: [makeEdge(), makeEdge()] });
  const found = findIssue(validateRelationshipGraph(graph).issues, "RELATIONSHIP_DUPLICATE_EDGE");
  assert.ok(found);
});

test("validateRelationshipGraph: flags a node with no edge touching it as an orphan warning", () => {
  const graph = makeGraph({ nodes: [makeNode({ id: "rel-page-a" }), makeNode({ id: "rel-page-b" }), makeNode({ id: "rel-page-c", refId: "c", name: "Page C" })], edges: [makeEdge()] });
  const found = findIssue(validateRelationshipGraph(graph).issues, "RELATIONSHIP_ORPHAN_NODE");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});

test("validateRelationshipGraph: regression — the real relationship graph produces zero errors", () => {
  const errors = validateRelationshipGraph(buildRelationshipGraph()).issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, []);
});

function makeRec(overrides: Partial<RelationshipRecommendation> = {}): RelationshipRecommendation {
  return { sourceId: "a", targetId: "b", targetKind: "page", relationType: "relatedPage", signal: "explicit", weight: 100, anchorText: "B", ...overrides };
}

test("validateRecommendations: flags a self-referencing recommendation", () => {
  const found = findIssue(validateRecommendations([makeRec({ sourceId: "a", targetId: "a" })], makeGraph()).issues, "RECOMMENDATION_SELF_REFERENCE");
  assert.ok(found);
});

test("validateRecommendations: flags a recommendation targeting an entity that doesn't resolve", () => {
  const found = findIssue(validateRecommendations([makeRec({ targetId: "does-not-exist" })], makeGraph()).issues, "RECOMMENDATION_DANGLING_TARGET");
  assert.ok(found);
});

test("validateRecommendations: a recommendation targeting a real node produces no dangling-target issue", () => {
  const found = findIssue(validateRecommendations([makeRec({ targetId: "b" })], makeGraph()).issues, "RECOMMENDATION_DANGLING_TARGET");
  assert.equal(found, undefined);
});

test("validateRecommendations: does NOT flag a same-id, different-kind pair as a self-reference (the real \"vciso\" page-vs-service collision)", () => {
  const found = findIssue(
    validateRecommendations([makeRec({ sourceId: "vciso", sourceKind: "page", targetId: "vciso", targetKind: "service" })], makeGraph()).issues,
    "RECOMMENDATION_SELF_REFERENCE",
  );
  assert.equal(found, undefined);
});

test("validateRecommendations: DOES flag a same-id, same-kind pair as a self-reference", () => {
  const found = findIssue(
    validateRecommendations([makeRec({ sourceId: "a", sourceKind: "page", targetId: "a", targetKind: "page" })], makeGraph()).issues,
    "RECOMMENDATION_SELF_REFERENCE",
  );
  assert.ok(found);
});

test("validateRecommendations: flags duplicate recommendations", () => {
  const found = findIssue(validateRecommendations([makeRec(), makeRec()], makeGraph()).issues, "RECOMMENDATION_DUPLICATE");
  assert.ok(found);
});

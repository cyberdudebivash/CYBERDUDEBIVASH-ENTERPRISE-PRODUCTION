import { test } from "node:test";
import assert from "node:assert/strict";
import { rankRecommendations, dedupeRecommendations } from "../ranking/rankRecommendations";
import type { RelationshipRecommendation } from "../graph/types";

function makeRec(overrides: Partial<RelationshipRecommendation> = {}): RelationshipRecommendation {
  return { sourceId: "a", targetId: "b", targetKind: "page", relationType: "relatedPage", signal: "explicit", weight: 100, anchorText: "B", ...overrides };
}

test("rankRecommendations: sorts by weight descending", () => {
  const ranked = rankRecommendations([makeRec({ targetId: "low", weight: 10 }), makeRec({ targetId: "high", weight: 90 })]);
  assert.deepEqual(ranked.map((r) => r.targetId), ["high", "low"]);
});

test("rankRecommendations: breaks ties deterministically by targetId ascending", () => {
  const ranked = rankRecommendations([makeRec({ targetId: "z", weight: 50 }), makeRec({ targetId: "a", weight: 50 })]);
  assert.deepEqual(ranked.map((r) => r.targetId), ["a", "z"]);
});

test("rankRecommendations: applies an optional limit after sorting", () => {
  const ranked = rankRecommendations([makeRec({ targetId: "low", weight: 10 }), makeRec({ targetId: "high", weight: 90 })], 1);
  assert.deepEqual(ranked.map((r) => r.targetId), ["high"]);
});

test("rankRecommendations: is deterministic across repeated calls with the same input", () => {
  const input = [makeRec({ targetId: "b", weight: 50 }), makeRec({ targetId: "a", weight: 50 }), makeRec({ targetId: "c", weight: 90 })];
  assert.deepEqual(rankRecommendations(input), rankRecommendations(input));
});

test("dedupeRecommendations: keeps the first occurrence per (targetId, relationType)", () => {
  const deduped = dedupeRecommendations([makeRec({ targetId: "b", weight: 90 }), makeRec({ targetId: "b", weight: 10 })]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].weight, 90);
});

test("dedupeRecommendations: keeps two recommendations for the same target with different relationTypes", () => {
  const deduped = dedupeRecommendations([makeRec({ targetId: "b", relationType: "relatedPage" }), makeRec({ targetId: "b", relationType: "relatedCategory", weight: 30 })]);
  assert.equal(deduped.length, 2);
});

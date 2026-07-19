import { test } from "node:test";
import assert from "node:assert/strict";
import { computeReadinessScore } from "../reports/readinessScore";
import { makeView, makeEnrichment, makeRecommendation } from "./fixtures";

test("computeReadinessScore: fieldCompleteness reflects the 6 pre-existing SEOCommercialFields only", () => {
  const view = makeView({ audience: ["a"], businessObjective: "b", commercialPriority: "high" });
  const score = computeReadinessScore(view, makeEnrichment(), 0);
  assert.equal(score.fieldCompleteness, 50); // 3 of 6
});

test("computeReadinessScore: fieldCompleteness is 0 when none of the 6 fields are set", () => {
  const score = computeReadinessScore(makeView(), makeEnrichment(), 0);
  assert.equal(score.fieldCompleteness, 0);
});

test("computeReadinessScore: fieldCompleteness is 100 when all 6 fields are set", () => {
  const view = makeView({
    audience: ["a"],
    businessObjective: "b",
    commercialPriority: "high",
    conversionGoal: "c",
    primaryCta: { label: "L", path: "/x" },
    secondaryCta: { label: "L2", path: "/y" },
  });
  assert.equal(computeReadinessScore(view, makeEnrichment(), 0).fieldCompleteness, 100);
});

test("computeReadinessScore: relationshipCompleteness reflects how many of the 6 real relationship kinds have at least one recommendation", () => {
  const enrichment = makeEnrichment({ relatedProducts: [makeRecommendation()], relatedServices: [makeRecommendation()] });
  assert.equal(computeReadinessScore(makeView(), enrichment, 0).relationshipCompleteness, 33); // 2 of 6, rounded
});

test("computeReadinessScore: validationHealth applies a fixed penalty per error, floored at 0", () => {
  assert.equal(computeReadinessScore(makeView(), makeEnrichment(), 0).validationHealth, 100);
  assert.equal(computeReadinessScore(makeView(), makeEnrichment(), 2).validationHealth, 60);
  assert.equal(computeReadinessScore(makeView(), makeEnrichment(), 10).validationHealth, 0);
});

test("computeReadinessScore: overallScore is the equal-weighted average of all four dimensions", () => {
  const view = makeView({ audience: ["a"], businessObjective: "b", commercialPriority: "high", conversionGoal: "c", primaryCta: { label: "L", path: "/x" }, secondaryCta: { label: "L2", path: "/y" } });
  const enrichment = makeEnrichment({ relatedProducts: [makeRecommendation()], relatedServices: [makeRecommendation()], relatedSolutions: [makeRecommendation()] });
  const score = computeReadinessScore(view, enrichment, 0);
  const expected = Math.round((score.fieldCompleteness + score.relationshipCompleteness + score.commercialCompleteness + score.validationHealth) / 4);
  assert.equal(score.overallScore, expected);
});

test("computeReadinessScore: is deterministic across repeated calls with the same input", () => {
  const view = makeView({ audience: ["a"] });
  const enrichment = makeEnrichment({ relatedProducts: [makeRecommendation()] });
  assert.deepEqual(computeReadinessScore(view, enrichment, 1), computeReadinessScore(view, enrichment, 1));
});

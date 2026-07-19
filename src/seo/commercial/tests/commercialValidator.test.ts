import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCommercialView, validateAllCommercialViews, validateRelationshipEnrichment } from "../validators/commercialValidator";
import { buildAllCommercialViews } from "../builders/buildCommercialView";
import type { ValidationIssue } from "../../validators/shared";
import { makeView, makeEnrichment, makeRecommendation } from "./fixtures";

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue | undefined {
  return issues.find((i) => i.code === code);
}

test("validateCommercialView: a fully populated view produces no missing-field issues", () => {
  const view = makeView({
    audience: ["a"],
    businessObjective: "b",
    commercialPriority: "high",
    conversionGoal: "c",
    primaryCta: { label: "L", path: "/x" },
    buyerPersona: [{ name: "n", role: "r", painPoints: [], goals: [] }],
    valueProposition: "v",
    customerPainPoints: ["p"],
    customerOutcomes: ["o"],
    primaryIndustry: "i",
    targetCompanySize: ["enterprise"],
    targetGeography: ["Global"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "t", description: "d" }],
    competitivePosition: "leader",
    contentClassification: ["decision"],
    keywords: { semanticKeywords: ["k"] },
  });
  const issues = validateCommercialView(view).issues;
  assert.deepEqual(
    issues.filter((i) => i.code === "COMMERCIAL_INTELLIGENCE_FIELD_MISSING"),
    [],
  );
});

test("validateCommercialView: flags each missing field by name", () => {
  const issues = validateCommercialView(makeView()).issues;
  const found = findIssue(issues, "COMMERCIAL_INTELLIGENCE_FIELD_MISSING");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});

test("validateCommercialView: flags missing keyword intelligence separately from other fields", () => {
  const found = findIssue(validateCommercialView(makeView()).issues, "COMMERCIAL_KEYWORD_INTELLIGENCE_MISSING");
  assert.ok(found);
});

test("validateCommercialView: a view with at least one keyword facet doesn't trigger the keyword-missing issue", () => {
  const view = makeView({ keywords: { semanticKeywords: ["threat detection"] } });
  const found = findIssue(validateCommercialView(view).issues, "COMMERCIAL_KEYWORD_INTELLIGENCE_MISSING");
  assert.equal(found, undefined);
});

test("validateAllCommercialViews: aggregates issues across multiple views", () => {
  const issues = validateAllCommercialViews([makeView({ id: "a" }), makeView({ id: "b" })]).issues;
  assert.ok(issues.some((i) => i.location === "a"));
  assert.ok(issues.some((i) => i.location === "b"));
});

test("validateAllCommercialViews: regression — every real pilot entity's view validates without throwing", () => {
  const views = buildAllCommercialViews();
  assert.equal(views.length, 12);
  const result = validateAllCommercialViews(views);
  assert.equal(result.validator, "validateCommercialView");
});

test("validateRelationshipEnrichment: flags an entity with zero recommendations across every real relationship kind", () => {
  const found = findIssue(validateRelationshipEnrichment(makeEnrichment()).issues, "COMMERCIAL_RELATIONSHIP_ENRICHMENT_EMPTY");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});

test("validateRelationshipEnrichment: does not flag an entity with at least one recommendation in one real kind", () => {
  const enrichment = makeEnrichment({ relatedProducts: [makeRecommendation()] });
  const found = findIssue(validateRelationshipEnrichment(enrichment).issues, "COMMERCIAL_RELATIONSHIP_ENRICHMENT_EMPTY");
  assert.equal(found, undefined);
});

test("validateRelationshipEnrichment: never penalizes the 7 reserved kinds for being empty", () => {
  // All 7 reserved kinds are empty in makeEnrichment()'s defaults, and
  // relatedProducts has one entry — this must NOT produce a
  // reserved-kind-specific issue anywhere.
  const enrichment = makeEnrichment({ relatedProducts: [makeRecommendation()] });
  const issues = validateRelationshipEnrichment(enrichment).issues;
  assert.deepEqual(issues, []);
});

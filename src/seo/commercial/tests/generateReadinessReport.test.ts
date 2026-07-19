import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCommercialReadinessReport } from "../reports/generateReadinessReport";

// Regression tests against the real, committed 12-entity pilot — the
// same principle every prior phase's own report-generator test suite
// follows.

test("generateCommercialReadinessReport: covers all 12 real pilot entities", () => {
  const report = generateCommercialReadinessReport();
  assert.equal(report.pilotEntityCount, 12);
  assert.equal(report.scores.length, 12);
});

test("generateCommercialReadinessReport: every score is a finite number between 0 and 100", () => {
  const report = generateCommercialReadinessReport();
  for (const score of report.scores) {
    for (const dimension of [score.fieldCompleteness, score.relationshipCompleteness, score.commercialCompleteness, score.validationHealth, score.overallScore]) {
      assert.ok(Number.isFinite(dimension) && dimension >= 0 && dimension <= 100);
    }
  }
});

test("generateCommercialReadinessReport: the baseline validators are Phase 1.0.5's own, unmodified — 0 errors against the real model", () => {
  const report = generateCommercialReadinessReport();
  assert.deepEqual(report.baseline.commercial.issues.filter((i) => i.severity === "error"), []);
  assert.deepEqual(report.baseline.cta.issues.filter((i) => i.severity === "error"), []);
});

test("generateCommercialReadinessReport: the enriched pilot entities show zero error-severity commercial issues", () => {
  const report = generateCommercialReadinessReport();
  assert.deepEqual(
    report.enrichment.issues.filter((i) => i.severity === "error"),
    [],
  );
});

test("generateCommercialReadinessReport: averageScore is the mean of every entity's overallScore", () => {
  const report = generateCommercialReadinessReport();
  const expected = Math.round(report.scores.reduce((sum, s) => sum + s.overallScore, 0) / report.scores.length);
  assert.equal(report.averageScore, expected);
});

test("generateCommercialReadinessReport: is deterministic across repeated calls (generatedAt aside)", () => {
  const a = generateCommercialReadinessReport();
  const b = generateCommercialReadinessReport();
  assert.deepEqual(a.scores, b.scores);
  assert.equal(a.averageScore, b.averageScore);
});

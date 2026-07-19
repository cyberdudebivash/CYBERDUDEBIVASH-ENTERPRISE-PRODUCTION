import { test } from "node:test";
import assert from "node:assert/strict";
import { getRuntimeHealth, assertRuntimeHealthy } from "../health/buildHealth";
import { RuntimeHealthError } from "../contracts/errors";

test("getRuntimeHealth: returns a status for all five dimensions", () => {
  const health = getRuntimeHealth();
  for (const dimension of ["status", "configuration", "pipeline", "relationships", "validation", "commercial"] as const) {
    assert.ok(["healthy", "warning", "error"].includes(health[dimension]));
  }
});

test("getRuntimeHealth: pipeline is healthy (every real page runs the full pipeline without throwing)", () => {
  const health = getRuntimeHealth();
  assert.equal(health.pipeline, "healthy");
  assert.deepEqual(health.issues.pipelineFailures, []);
});

test("getRuntimeHealth: overall status matches the pre-implementation baseline (0 errors, warnings present)", () => {
  const health = getRuntimeHealth();
  assert.equal(health.status, "warning");
  assert.deepEqual(health.issues.configurationIssues, []);
});

test("getRuntimeHealth: zero duplicate ids and zero broken references (matches the real, validated configuration)", () => {
  const health = getRuntimeHealth();
  assert.deepEqual(health.issues.duplicateIds, []);
  assert.deepEqual(health.issues.brokenReferences, []);
});

test("assertRuntimeHealthy: does not throw against the real platform (status is 'warning', not 'error')", () => {
  assert.doesNotThrow(() => assertRuntimeHealthy());
});

test("assertRuntimeHealthy: throws RuntimeHealthError for a synthetic 'error' report", () => {
  assert.throws(
    () =>
      assertRuntimeHealthy({
        status: "error",
        configuration: "error",
        pipeline: "healthy",
        relationships: "healthy",
        validation: "error",
        commercial: "healthy",
        issues: { missingEntities: [], brokenReferences: [], duplicateIds: [], configurationIssues: ["synthetic failure"], pipelineFailures: [] },
      }),
    RuntimeHealthError,
  );
});

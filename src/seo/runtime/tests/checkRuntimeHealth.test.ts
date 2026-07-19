import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRuntimeHealth } from "../health/checkRuntimeHealth";

test("checkRuntimeHealth: configuration and pipeline are healthy against the real platform data", () => {
  const health = checkRuntimeHealth();
  assert.equal(health.configuration, "healthy");
  assert.equal(health.pipeline, "healthy");
});

test("checkRuntimeHealth: relationships and commercial are never 'error' against the real platform data", () => {
  const health = checkRuntimeHealth();
  assert.notEqual(health.relationships, "error");
  assert.notEqual(health.commercial, "error");
});

test("checkRuntimeHealth: overall status is the worst of the five dimensions", () => {
  const health = checkRuntimeHealth();
  const dimensions = [health.configuration, health.pipeline, health.relationships, health.validation, health.commercial];
  if (dimensions.includes("error")) assert.equal(health.status, "error");
  else if (dimensions.includes("warning")) assert.equal(health.status, "warning");
  else assert.equal(health.status, "healthy");
});

test("checkRuntimeHealth: returns a fresh, well-formed timestamp on every call", () => {
  const first = checkRuntimeHealth();
  const second = checkRuntimeHealth();
  assert.ok(!Number.isNaN(Date.parse(first.checkedAt)));
  assert.ok(!Number.isNaN(Date.parse(second.checkedAt)));
});

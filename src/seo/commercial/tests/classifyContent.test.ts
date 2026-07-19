import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveContentClassification } from "../builders/classifyContent";

test("deriveContentClassification: uses the explicit classification when set", () => {
  assert.deepEqual(deriveContentClassification(["research", "threat-intelligence"], "awareness"), ["research", "threat-intelligence"]);
});

test("deriveContentClassification: falls back to a direct funnelStage mapping when no explicit classification is set", () => {
  assert.deepEqual(deriveContentClassification(undefined, "decision"), ["decision"]);
});

test("deriveContentClassification: returns [] when neither an explicit classification nor a funnelStage exists", () => {
  assert.deepEqual(deriveContentClassification(undefined, undefined), []);
});

test("deriveContentClassification: an empty explicit array falls back to funnelStage rather than staying empty", () => {
  assert.deepEqual(deriveContentClassification([], "retention"), ["retention"]);
});

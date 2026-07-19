import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigurationError,
  PipelineError,
  ValidationError,
  RelationshipError,
  RuntimeHealthError,
  DuplicateEntityError,
  SEORuntimeError,
} from "../contracts/errors";

test("every typed Runtime error extends SEORuntimeError and carries a stable code + stage", () => {
  const cases: [SEORuntimeError, string][] = [
    [new ConfigurationError("x"), "CONFIGURATION_ERROR"],
    [new PipelineError("x", "metadata"), "PIPELINE_ERROR"],
    [new ValidationError("x", []), "VALIDATION_ERROR"],
    [new RelationshipError("x", []), "RELATIONSHIP_ERROR"],
    [new RuntimeHealthError("x"), "RUNTIME_HEALTH_ERROR"],
    [new DuplicateEntityError("x", "some-id"), "DUPLICATE_ENTITY_ERROR"],
  ];

  for (const [error, code] of cases) {
    assert.ok(error instanceof SEORuntimeError);
    assert.ok(error instanceof Error);
    assert.equal(error.code, code);
    assert.ok(typeof error.stage === "string" && error.stage.length > 0);
  }
});

test("DuplicateEntityError carries the offending entityId", () => {
  const error = new DuplicateEntityError("duplicate found", "vciso");
  assert.equal(error.entityId, "vciso");
});

test("ValidationError and RelationshipError carry the offending issues", () => {
  const issue = { severity: "error" as const, code: "X", message: "m", location: "l" };
  assert.deepEqual(new ValidationError("x", [issue]).issues, [issue]);
  assert.deepEqual(new RelationshipError("x", [issue]).issues, [issue]);
});

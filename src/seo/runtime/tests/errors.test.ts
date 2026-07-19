import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEORuntimeError,
  ConfigurationError,
  PipelineError,
  ValidationError,
  RelationshipError,
  RuntimeHealthError,
  DuplicateEntityError,
} from "../contracts/errors";

const CLASSES = [ConfigurationError, PipelineError, ValidationError, RelationshipError, RuntimeHealthError, DuplicateEntityError];

test("every typed runtime error is an instance of SEORuntimeError and Error", () => {
  for (const ErrorClass of CLASSES) {
    const instance = new ErrorClass("test message");
    assert.ok(instance instanceof SEORuntimeError);
    assert.ok(instance instanceof Error);
  }
});

test("every typed runtime error's name matches its class name (not the generic 'Error')", () => {
  for (const ErrorClass of CLASSES) {
    const instance = new ErrorClass("test message");
    assert.equal(instance.name, ErrorClass.name);
  }
});

test("every typed runtime error carries a stable, unique code", () => {
  const codes = CLASSES.map((ErrorClass) => new ErrorClass("x").code);
  assert.equal(new Set(codes).size, CLASSES.length);
});

test("every typed runtime error preserves its message", () => {
  for (const ErrorClass of CLASSES) {
    const instance = new ErrorClass("a specific message");
    assert.equal(instance.message, "a specific message");
  }
});

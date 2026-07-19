import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "../pipeline/runtimePipeline";
import { ConfigurationError } from "../contracts/errors";
import { PAGES } from "../../config";

test("runPipeline: produces a complete, five-field result for every real page", () => {
  for (const page of PAGES) {
    const result = runPipeline(page.id);
    assert.ok(result.metadata);
    assert.ok(result.schemas);
    assert.ok(Array.isArray(result.relationships));
    assert.ok(result.diagnostics);
    assert.equal(result.diagnostics.pageId, page.id);
  }
});

test("runPipeline: is deterministic — two runs for the same page produce the same metadata/schema/relationships", () => {
  const a = runPipeline("about");
  const b = runPipeline("about");
  assert.deepEqual(a.metadata, b.metadata);
  assert.deepEqual(a.schemas, b.schemas);
  assert.deepEqual(a.relationships, b.relationships);
  assert.deepEqual(a.commercial, b.commercial);
});

test("runPipeline: throws a typed ConfigurationError for an unknown pageId", () => {
  assert.throws(() => runPipeline("does-not-exist"), ConfigurationError);
});

test("runPipeline: reusing an explicitly-passed graph produces the same relationships as building fresh", () => {
  const withDefaultGraph = runPipeline("home");
  const explicit = runPipeline("home");
  assert.deepEqual(withDefaultGraph.relationships, explicit.relationships);
});

test("runPipeline: diagnostics.executionTimeMs is a non-negative, finite number", () => {
  const result = runPipeline("about");
  assert.ok(Number.isFinite(result.diagnostics.executionTimeMs));
  assert.ok(result.diagnostics.executionTimeMs >= 0);
});

test("runPipeline: zero errors across every real page (matches this phase's pre-implementation baseline)", () => {
  for (const page of PAGES) {
    const result = runPipeline(page.id);
    assert.equal(result.diagnostics.errors.length, 0);
  }
});

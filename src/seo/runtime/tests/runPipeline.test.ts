import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES } from "../../config";
import { runPipeline } from "../pipeline/runPipeline";
import { ConfigurationError } from "../contracts/errors";

test("runPipeline: produces a complete SEORuntimeResult for a real page", () => {
  const result = runPipeline("home");
  assert.equal(result.pageId, "home");
  assert.ok(result.metadata.title.length > 0);
  assert.ok(result.schemas["@graph"].length > 0);
  assert.ok(Array.isArray(result.relationships));
  assert.equal(result.diagnostics.pageId, "home");
  assert.ok(result.diagnostics.executionTimeMs >= 0);
});

test("runPipeline: commercial is undefined for a page outside the Phase 1.4 pilot", () => {
  const result = runPipeline("home");
  assert.equal(result.commercial, undefined);
  assert.equal(result.diagnostics.commercial.present, false);
});

test("runPipeline: commercial is populated for the 'about' pilot page", () => {
  const result = runPipeline("about");
  assert.ok(result.commercial);
  assert.equal(result.commercial?.id, "about");
  assert.equal(result.commercial?.kind, "page");
  assert.equal(result.diagnostics.commercial.present, true);
});

test("runPipeline: throws ConfigurationError for an unknown pageId", () => {
  assert.throws(() => runPipeline("does-not-exist"), ConfigurationError);
});

test("runPipeline: is deterministic — two runs for the same page produce the same metadata, schemas, and relationships", () => {
  const first = runPipeline("services");
  const second = runPipeline("services");
  assert.deepEqual(first.metadata, second.metadata);
  assert.deepEqual(first.schemas, second.schemas);
  assert.deepEqual(first.relationships, second.relationships);
  assert.equal(first.commercial?.id, second.commercial?.id);
});

test("runPipeline: succeeds for every real page in PAGES", () => {
  for (const page of PAGES) {
    assert.doesNotThrow(() => runPipeline(page.id), `runPipeline should not throw for page "${page.id}"`);
  }
});

test("runPipeline: diagnostics.schema.nodeTypes matches the real generated schema graph", () => {
  const result = runPipeline("home");
  const realTypes = Array.from(new Set(result.schemas["@graph"].map((n) => n["@type"]))).sort();
  assert.deepEqual(result.diagnostics.schema.nodeTypes, realTypes);
});

test("runPipeline: diagnostics.relationships.total matches result.relationships.length", () => {
  const result = runPipeline("home");
  assert.equal(result.diagnostics.relationships.total, result.relationships.length);
});

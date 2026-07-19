import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO, createSEORuntime } from "../runtime";
import { runPipeline } from "../pipeline/runtimePipeline";
import { ConfigurationError } from "../contracts/errors";
import { PAGES } from "../../config";
import type { SEORuntimeResult } from "../contracts/types";

/** Diagnostics carries `generatedAt`/`executionTimeMs`, which legitimately differ between two otherwise-identical runs (wall-clock timestamp, measured duration) — strip them before asserting two results are the "same" data. */
function withoutTimings(result: SEORuntimeResult) {
  const { generatedAt: _generatedAt, executionTimeMs: _executionTimeMs, ...rest } = result.diagnostics;
  return { ...result, diagnostics: rest };
}

test("generateSEO: is the runtime contract exactly as specified — metadata/schemas/relationships/commercial/diagnostics", () => {
  const result = generateSEO("about");
  const keys = Object.keys(result).sort();
  assert.deepEqual(keys, ["commercial", "diagnostics", "metadata", "relationships", "schemas"]);
});

test("generateSEO: matches runPipeline's own output for every real page", () => {
  for (const page of PAGES) {
    const viaRuntime = generateSEO(page.id);
    const viaPipeline = runPipeline(page.id);
    assert.deepEqual(viaRuntime.metadata, viaPipeline.metadata);
    assert.deepEqual(viaRuntime.schemas, viaPipeline.schemas);
    assert.deepEqual(viaRuntime.relationships, viaPipeline.relationships);
    assert.deepEqual(viaRuntime.commercial, viaPipeline.commercial);
  }
});

test("generateSEO: throws a typed ConfigurationError for an unknown pageId", () => {
  assert.throws(() => generateSEO("does-not-exist"), ConfigurationError);
});

test("generateSEO: is stateless — repeated calls never share or leak state between them", () => {
  const a = generateSEO("about");
  const b = generateSEO("about");
  assert.deepEqual(withoutTimings(a), withoutTimings(b));
  assert.notEqual(a, b);
});

test("createSEORuntime: generateSEO() returns the same data as the stateless generateSEO()", () => {
  const runtime = createSEORuntime();
  const cached = runtime.generateSEO("about");
  const stateless = generateSEO("about");
  assert.deepEqual(cached.metadata, stateless.metadata);
  assert.deepEqual(cached.schemas, stateless.schemas);
  assert.deepEqual(cached.relationships, stateless.relationships);
  assert.deepEqual(cached.commercial, stateless.commercial);
});

test("createSEORuntime: a second call for the same page returns the identical cached object", () => {
  const runtime = createSEORuntime();
  const first = runtime.generateSEO("about");
  const second = runtime.generateSEO("about");
  assert.equal(first, second);
});

test("createSEORuntime: two independent runtimes never share cache state", () => {
  const runtimeA = createSEORuntime();
  const runtimeB = createSEORuntime();
  const resultA = runtimeA.generateSEO("about");
  const resultB = runtimeB.generateSEO("about");
  assert.notEqual(resultA, resultB);
  assert.deepEqual(withoutTimings(resultA), withoutTimings(resultB));
});

test("createSEORuntime: every real page resolves successfully through the cached runtime", () => {
  const runtime = createSEORuntime();
  for (const page of PAGES) {
    assert.doesNotThrow(() => runtime.generateSEO(page.id));
  }
});

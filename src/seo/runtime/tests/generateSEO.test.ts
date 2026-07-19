import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO, clearRuntimeCache, getRuntimeCacheSize } from "../integration/generateSEO";
import { ConfigurationError } from "../contracts/errors";

test("generateSEO: returns a complete SEORuntimeResult for a real page", () => {
  clearRuntimeCache();
  const result = generateSEO("home");
  assert.equal(result.pageId, "home");
  assert.ok(result.metadata.title.length > 0);
});

test("generateSEO: a second call for the same page returns the cached (identical) object", () => {
  clearRuntimeCache();
  const first = generateSEO("apps");
  const second = generateSEO("apps");
  assert.equal(first, second);
});

test("generateSEO: skipCache always runs the pipeline fresh and never populates the cache", () => {
  clearRuntimeCache();
  const first = generateSEO("apps", { skipCache: true });
  const second = generateSEO("apps", { skipCache: true });
  assert.notEqual(first, second);
  assert.deepEqual(first.metadata, second.metadata);
  assert.equal(getRuntimeCacheSize(), 0);
});

test("generateSEO: clearRuntimeCache forces the next call to run the pipeline again", () => {
  clearRuntimeCache();
  const first = generateSEO("contact");
  clearRuntimeCache();
  const second = generateSEO("contact");
  assert.notEqual(first, second);
  assert.deepEqual(first.metadata, second.metadata);
});

test("generateSEO: a thrown error is never cached", () => {
  clearRuntimeCache();
  assert.throws(() => generateSEO("does-not-exist"), ConfigurationError);
  assert.equal(getRuntimeCacheSize(), 0);
});

test("generateSEO: caching is keyed per page", () => {
  clearRuntimeCache();
  generateSEO("home");
  generateSEO("about");
  assert.equal(getRuntimeCacheSize(), 2);
});

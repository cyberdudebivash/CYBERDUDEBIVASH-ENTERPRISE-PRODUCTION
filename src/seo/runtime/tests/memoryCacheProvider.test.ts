import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryCacheProvider } from "../cache/memoryCacheProvider";

test("MemoryCacheProvider: set/get/has round-trip", () => {
  const cache = createMemoryCacheProvider<string>();
  assert.equal(cache.has("a"), false);
  cache.set("a", "value-a");
  assert.equal(cache.has("a"), true);
  assert.equal(cache.get("a"), "value-a");
  assert.equal(cache.size, 1);
});

test("MemoryCacheProvider: get returns undefined for a missing key", () => {
  const cache = createMemoryCacheProvider<string>();
  assert.equal(cache.get("missing"), undefined);
});

test("MemoryCacheProvider: delete removes exactly one key", () => {
  const cache = createMemoryCacheProvider<number>();
  cache.set("a", 1);
  cache.set("b", 2);
  assert.equal(cache.delete("a"), true);
  assert.equal(cache.has("a"), false);
  assert.equal(cache.has("b"), true);
  assert.equal(cache.delete("a"), false);
});

test("MemoryCacheProvider: clear empties the cache", () => {
  const cache = createMemoryCacheProvider<number>();
  cache.set("a", 1);
  cache.set("b", 2);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.has("a"), false);
});

test("MemoryCacheProvider: two instances never share state", () => {
  const first = createMemoryCacheProvider<string>();
  const second = createMemoryCacheProvider<string>();
  first.set("a", "only-in-first");
  assert.equal(second.has("a"), false);
});

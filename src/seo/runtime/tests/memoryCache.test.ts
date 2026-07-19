import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryCacheProvider } from "../cache/memoryCache";
import { buildValidatedRelationshipGraph } from "../integration/relationshipIntegration";
import { generateSEO } from "../runtime";

test("MemoryCacheProvider: create() returns an empty cache", () => {
  const cache = MemoryCacheProvider.create();
  assert.equal(MemoryCacheProvider.readPage(cache, "about"), undefined);
  assert.equal(MemoryCacheProvider.readGraph(cache), undefined);
  assert.equal(MemoryCacheProvider.readConfigurationReport(cache), undefined);
});

test("MemoryCacheProvider: writePage() never mutates the cache it was given", () => {
  const empty = MemoryCacheProvider.create();
  const result = generateSEO("about");
  const written = MemoryCacheProvider.writePage(empty, "about", { result });
  assert.equal(MemoryCacheProvider.readPage(empty, "about"), undefined);
  assert.deepEqual(MemoryCacheProvider.readPage(written, "about")?.result, result);
});

test("MemoryCacheProvider: writeGraph() never mutates the cache it was given", () => {
  const empty = MemoryCacheProvider.create();
  const graph = buildValidatedRelationshipGraph();
  const written = MemoryCacheProvider.writeGraph(empty, graph);
  assert.equal(MemoryCacheProvider.readGraph(empty), undefined);
  assert.deepEqual(MemoryCacheProvider.readGraph(written), graph);
});

test("MemoryCacheProvider: two independent cache values never share state", () => {
  const cacheA = MemoryCacheProvider.create();
  const cacheB = MemoryCacheProvider.writePage(cacheA, "about", { result: generateSEO("about") });
  assert.equal(MemoryCacheProvider.readPage(cacheA, "about"), undefined);
  assert.notEqual(MemoryCacheProvider.readPage(cacheB, "about"), undefined);
});

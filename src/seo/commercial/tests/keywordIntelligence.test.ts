import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeAllKeywords } from "../builders/keywordIntelligence";

test("mergeAllKeywords: combines primaryKeyword/secondaryKeywords with every keyword-intelligence facet", () => {
  const merged = mergeAllKeywords("soc pricing", ["24x7 SOC"], { semanticKeywords: ["threat detection"], commercialKeywords: ["SOC assessment"] });
  assert.deepEqual(merged, ["soc pricing", "24x7 SOC", "threat detection", "SOC assessment"]);
});

test("mergeAllKeywords: dedupes case-insensitively across every source", () => {
  const merged = mergeAllKeywords("SOC", ["soc"], { semanticKeywords: ["Soc "] });
  assert.deepEqual(merged, ["SOC"]);
});

test("mergeAllKeywords: handles no keyword intelligence at all", () => {
  assert.deepEqual(mergeAllKeywords("soc", undefined, undefined), ["soc"]);
});

test("mergeAllKeywords: handles a completely empty entity", () => {
  assert.deepEqual(mergeAllKeywords(undefined, undefined, undefined), []);
});

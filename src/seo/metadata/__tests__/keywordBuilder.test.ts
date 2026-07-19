import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKeywords } from "../keywordBuilder";

test("buildKeywords: combines primaryKeyword and secondaryKeywords in order", () => {
  assert.deepEqual(buildKeywords({ primaryKeyword: "soc", secondaryKeywords: ["siem", "soar"] }), ["soc", "siem", "soar"]);
});

test("buildKeywords: dedupes case-insensitively across primary and secondary, keeping the first casing seen", () => {
  assert.deepEqual(buildKeywords({ primaryKeyword: "SOC", secondaryKeywords: ["soc", "SIEM"] }), ["SOC", "SIEM"]);
});

test("buildKeywords: returns an empty array when both primaryKeyword and secondaryKeywords are missing", () => {
  assert.deepEqual(buildKeywords({}), []);
});

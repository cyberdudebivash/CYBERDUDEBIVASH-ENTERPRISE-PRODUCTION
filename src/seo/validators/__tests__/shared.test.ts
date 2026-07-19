import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicates, collectIds, checkReference, isMissing, coverageCount } from "../shared";

test("findDuplicates: returns only groups with more than one member", () => {
  const items = [{ k: "a" }, { k: "b" }, { k: "a" }];
  const dupes = findDuplicates(items, (i) => i.k);
  assert.equal(dupes.size, 1);
  assert.deepEqual(dupes.get("a"), [{ k: "a" }, { k: "a" }]);
});

test("findDuplicates: skips items whose key is undefined", () => {
  const items: Array<{ k: string | undefined }> = [{ k: undefined }, { k: undefined }];
  const dupes = findDuplicates(items, (i) => i.k);
  assert.equal(dupes.size, 0);
});

test("collectIds: builds a Set of ids", () => {
  const ids = collectIds([{ id: "a" }, { id: "b" }], (i) => i.id);
  assert.deepEqual([...ids].sort(), ["a", "b"]);
});

test("checkReference: returns undefined when the reference resolves", () => {
  const result = checkReference("a", new Set(["a", "b"]), "CODE", (id) => `bad ${id}`, "loc");
  assert.equal(result, undefined);
});

test("checkReference: returns an error issue when the reference does not resolve", () => {
  const result = checkReference("z", new Set(["a", "b"]), "CODE", (id) => `bad ${id}`, "loc");
  assert.ok(result);
  assert.equal(result?.severity, "error");
  assert.equal(result?.code, "CODE");
});

test("checkReference: returns undefined when refId itself is absent (a completeness concern, not a broken reference)", () => {
  const result = checkReference(undefined, new Set(["a"]), "CODE", (id) => `bad ${id}`, "loc");
  assert.equal(result, undefined);
});

test("isMissing: treats undefined, null, blank strings, and empty arrays as missing", () => {
  assert.equal(isMissing(undefined), true);
  assert.equal(isMissing(null), true);
  assert.equal(isMissing(""), true);
  assert.equal(isMissing("  "), true);
  assert.equal(isMissing([]), true);
  assert.equal(isMissing("value"), false);
  assert.equal(isMissing(["value"]), false);
  assert.equal(isMissing(0), false);
});

test("coverageCount: counts items where the selector is not missing", () => {
  const count = coverageCount([{ v: "a" }, { v: undefined }, { v: "b" }], (i) => i.v);
  assert.equal(count, 2);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchAction } from "../builders/searchActionBuilder";

test("buildSearchAction: builds a SearchAction node from a given target template", () => {
  const node = buildSearchAction("https://www.cyberdudebivash.com/search?q={search_term_string}");
  assert.equal(node["@type"], "SearchAction");
  assert.equal(node.target, "https://www.cyberdudebivash.com/search?q={search_term_string}");
  assert.equal(node["query-input"], "required name=search_term_string");
});

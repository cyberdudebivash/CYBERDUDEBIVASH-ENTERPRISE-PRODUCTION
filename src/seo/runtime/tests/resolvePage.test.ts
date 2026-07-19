import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePage } from "../integration/resolvePage";
import { ConfigurationError } from "../contracts/errors";
import { PAGES } from "../../config";

test("resolvePage: resolves every real page by id", () => {
  for (const page of PAGES) {
    assert.equal(resolvePage(page.id).id, page.id);
  }
});

test("resolvePage: throws a typed ConfigurationError for an unknown id", () => {
  assert.throws(() => resolvePage("does-not-exist"), ConfigurationError);
});

test("resolvePage: the thrown error names the offending id", () => {
  assert.throws(() => resolvePage("does-not-exist"), /does-not-exist/);
});

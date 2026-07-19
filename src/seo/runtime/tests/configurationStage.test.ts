import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePage } from "../pipeline/stages/configurationStage";
import { ConfigurationError } from "../contracts/errors";

test("resolvePage: resolves a real page id", () => {
  const page = resolvePage("home");
  assert.equal(page.id, "home");
});

test("resolvePage: throws ConfigurationError for an unknown pageId", () => {
  assert.throws(() => resolvePage("does-not-exist"), ConfigurationError);
  assert.throws(() => resolvePage("does-not-exist"), /no page with id "does-not-exist"/);
});

test("resolvePage: throws ConfigurationError for an empty pageId", () => {
  assert.throws(() => resolvePage(""), ConfigurationError);
  assert.throws(() => resolvePage("   "), ConfigurationError);
});

test("resolvePage: the thrown error carries a stage name", () => {
  try {
    resolvePage("does-not-exist");
    assert.fail("expected resolvePage to throw");
  } catch (error) {
    assert.ok(error instanceof ConfigurationError);
    assert.equal(error.stage, "configuration");
    assert.equal(error.code, "CONFIGURATION_ERROR");
  }
});

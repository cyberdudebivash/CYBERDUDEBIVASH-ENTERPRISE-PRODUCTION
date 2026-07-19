import { test } from "node:test";
import assert from "node:assert/strict";
import { integrateSchema } from "../integration/schemaIntegration";
import { composePageSchemaSet, validatePageSchemaSet } from "../../schema";
import { PAGES } from "../../config";

test("integrateSchema: matches Phase 1.2's own composePageSchemaSet output exactly, for every page", () => {
  for (const page of PAGES) {
    assert.deepEqual(integrateSchema(page), composePageSchemaSet(page));
  }
});

test("integrateSchema: every real page's composed schema set passes SchemaValidator with zero errors", () => {
  for (const page of PAGES) {
    const result = validatePageSchemaSet(integrateSchema(page));
    assert.equal(result.issues.filter((i) => i.severity === "error").length, 0);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSchemaNode, validatePageSchemaSet } from "../validators/schemaValidator";
import { toPageSchemaSet } from "../normalizers";
import type { SchemaNode } from "../types/nodes";
import type { ValidationIssue } from "../../validators/shared";

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue | undefined {
  return issues.find((i) => i.code === code);
}

function makeWebPage(overrides: Partial<SchemaNode & { "@type": "WebPage" }> = {}): SchemaNode {
  return {
    "@type": "WebPage",
    "@id": "https://example.com/#webpage",
    url: "https://example.com/",
    name: "Example",
    description: "An example.",
    isPartOf: { "@id": "https://example.com/#website" },
    inLanguage: "en",
    ...overrides,
  };
}

test("validateSchemaNode: a well-formed node produces no errors", () => {
  const errors = validateSchemaNode(makeWebPage()).issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, []);
});

test("validateSchemaNode: flags a missing name as an error", () => {
  const node = makeWebPage({ name: "" });
  const found = findIssue(validateSchemaNode(node).issues, "SCHEMA_MISSING_NAME");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateSchemaNode: flags a non-absolute @id as an error", () => {
  const node = makeWebPage({ "@id": "/relative#webpage" });
  const found = findIssue(validateSchemaNode(node).issues, "SCHEMA_ID_NOT_ABSOLUTE");
  assert.ok(found);
});

test("validateSchemaNode: flags a non-absolute url as an error", () => {
  const node = makeWebPage({ url: "/relative.html" });
  const found = findIssue(validateSchemaNode(node).issues, "SCHEMA_URL_NOT_ABSOLUTE");
  assert.ok(found);
});

test("validatePageSchemaSet: flags a duplicate @id across two nodes", () => {
  const set = { "@context": "https://schema.org" as const, "@graph": [makeWebPage(), makeWebPage()] };
  const found = findIssue(validatePageSchemaSet(set).issues, "SCHEMA_DUPLICATE_ID");
  assert.ok(found);
});

test("validatePageSchemaSet: flags a reference to an @id that isn't present in the graph", () => {
  const set = toPageSchemaSet([makeWebPage({ isPartOf: { "@id": "https://example.com/#missing-website" } })]);
  const found = findIssue(validatePageSchemaSet(set).issues, "SCHEMA_UNRESOLVED_REFERENCE");
  assert.ok(found);
});

test("validatePageSchemaSet: a reference that IS present in the graph produces no unresolved-reference issue", () => {
  const website: SchemaNode = { "@type": "WebSite", "@id": "https://example.com/#website", url: "https://example.com/", name: "Example", description: "d", publisher: { "@id": "https://example.com/#organization" } };
  const organization: SchemaNode = { "@type": "Organization", "@id": "https://example.com/#organization", name: "Example Org", url: "https://example.com/", logo: { "@type": "ImageObject", url: "https://example.com/logo.png" }, sameAs: [], contactPoint: [] };
  const set = toPageSchemaSet([makeWebPage(), website, organization]);
  const found = findIssue(validatePageSchemaSet(set).issues, "SCHEMA_UNRESOLVED_REFERENCE");
  assert.equal(found, undefined);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRODUCERS, registerProducer, resolveProducer, composePageSchemaSet, type SchemaProducer } from "../registry/schemaRegistry";
import { validatePageSchemaSet } from "../validators/schemaValidator";
import { PAGES } from "../../config";
import { makePage } from "./fixtures";

test("resolveProducer: finds a registered producer by id", () => {
  const found = resolveProducer(DEFAULT_PRODUCERS, "organization");
  assert.equal(found?.id, "organization");
});

test("resolveProducer: returns undefined for an unknown id", () => {
  assert.equal(resolveProducer(DEFAULT_PRODUCERS, "does-not-exist"), undefined);
});

test("registerProducer: returns a new array with the producer appended, without mutating the input", () => {
  const custom: SchemaProducer = { id: "custom", produce: () => [] };
  const extended = registerProducer(DEFAULT_PRODUCERS, custom);
  assert.equal(extended.length, DEFAULT_PRODUCERS.length + 1);
  assert.equal(DEFAULT_PRODUCERS.length, 8);
});

test("registerProducer: throws when a producer with the same id is already registered", () => {
  assert.throws(() => registerProducer(DEFAULT_PRODUCERS, { id: "organization", produce: () => [] }), /already registered/);
});

test("composePageSchemaSet: every page gets Organization, WebSite, WebPage, and BreadcrumbList", () => {
  const set = composePageSchemaSet(makePage());
  const types = set["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("WebPage"));
  assert.ok(types.includes("BreadcrumbList"));
});

test("composePageSchemaSet: LocalBusiness is only attached to the home page", () => {
  const homeSet = composePageSchemaSet(makePage({ id: "home", path: "/", canonical: { path: "/" } }));
  const otherSet = composePageSchemaSet(makePage({ id: "services", path: "/services.html", canonical: { path: "/services.html" } }));
  assert.ok(homeSet["@graph"].some((n) => n["@type"] === "LocalBusiness"));
  assert.ok(!otherSet["@graph"].some((n) => n["@type"] === "LocalBusiness"));
});

test("composePageSchemaSet: a custom producer list extends the default composition", () => {
  const custom: SchemaProducer = { id: "custom", produce: () => [{ "@type": "Organization", "@id": "https://example.com/#custom-org", name: "Custom", url: "https://example.com/", logo: { "@type": "ImageObject", url: "https://example.com/logo.png" }, sameAs: [], contactPoint: [] }] };
  const set = composePageSchemaSet(makePage(), registerProducer(DEFAULT_PRODUCERS, custom));
  assert.ok(set["@graph"].some((n) => n["@id"] === "https://example.com/#custom-org"));
});

test("composePageSchemaSet: regression — every real page in PAGES composes into a valid, error-free schema set", () => {
  for (const page of PAGES) {
    const set = composePageSchemaSet(page);
    const errors = validatePageSchemaSet(set).issues.filter((i) => i.severity === "error");
    assert.deepEqual(errors, [], `page "${page.id}" produced schema errors: ${JSON.stringify(errors)}`);
  }
});

test("composePageSchemaSet: the home page's relatedEntityIds produce SoftwareApplication nodes for its related products", () => {
  const home = PAGES.find((p) => p.id === "home")!;
  const set = composePageSchemaSet(home);
  const softwareApps = set["@graph"].filter((n) => n["@type"] === "SoftwareApplication");
  assert.ok(softwareApps.length > 0);
});

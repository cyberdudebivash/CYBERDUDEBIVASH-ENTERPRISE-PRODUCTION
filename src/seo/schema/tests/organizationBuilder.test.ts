import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrganization, organizationId } from "../builders/organizationBuilder";

// Organization has no synthetic-input parameter (it's a config-wide
// singleton), so these are regression tests against the real,
// committed organization.config.ts data.

test("buildOrganization: produces the real organization's name, url, and @id", () => {
  const node = buildOrganization();
  assert.equal(node["@type"], "Organization");
  assert.equal(node.name, "CYBERDUDEBIVASH PRIVATE LIMITED");
  assert.equal(node.url, "https://www.cyberdudebivash.com/");
  assert.equal(node["@id"], organizationId());
  assert.match(node["@id"], /^https:\/\/www\.cyberdudebivash\.com\/#organization$/);
});

test("buildOrganization: resolves logo to an absolute ImageObject", () => {
  const node = buildOrganization();
  assert.equal(node.logo["@type"], "ImageObject");
  assert.ok(node.logo.url.startsWith("https://"));
});

test("buildOrganization: includes every real contact point", () => {
  const node = buildOrganization();
  assert.equal(node.contactPoint.length, 2);
  assert.ok(node.contactPoint.every((cp) => cp["@type"] === "ContactPoint"));
});

test("buildOrganization: carries the full real sameAs list without mutating the source array", () => {
  const node = buildOrganization();
  assert.ok(node.sameAs.length > 20);
  node.sameAs.push("https://mutated.example.com/");
  assert.notEqual(buildOrganization().sameAs.length, node.sameAs.length);
});

test("buildOrganization: includes the real founder", () => {
  const node = buildOrganization();
  assert.deepEqual(node.founder, { "@type": "Person", name: "Bivasha Kumar Nayak" });
});

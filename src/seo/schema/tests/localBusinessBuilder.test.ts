import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLocalBusiness } from "../builders/localBusinessBuilder";

// A singleton, like Organization — regression tests against the real
// organization.config.ts / site.config.ts data.

test("buildLocalBusiness: composes the real organization's name and address", () => {
  const node = buildLocalBusiness();
  assert.equal(node["@type"], "LocalBusiness");
  assert.equal(node.name, "CYBERDUDEBIVASH PRIVATE LIMITED");
  assert.equal(node.address["@type"], "PostalAddress");
  assert.equal(node.address.addressCountry, "IN");
});

test("buildLocalBusiness: geo coordinates come from SiteConfig", () => {
  const node = buildLocalBusiness();
  assert.equal(node.geo?.["@type"], "GeoCoordinates");
  assert.equal(node.geo?.latitude, 20.8491);
  assert.equal(node.geo?.longitude, 86.1648);
});

test("buildLocalBusiness: telephone comes from the organization's primary contact point", () => {
  const node = buildLocalBusiness();
  assert.equal(node.telephone, "+91 81798 81447");
});

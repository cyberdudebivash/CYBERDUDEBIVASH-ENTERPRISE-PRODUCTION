import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSoftwareApplication } from "../builders/softwareApplicationBuilder";
import { organizationId } from "../builders/organizationBuilder";
import { makeProduct } from "./fixtures";

test("buildSoftwareApplication: composes name/description/url", () => {
  const node = buildSoftwareApplication(makeProduct({ name: "Sentinel APEX", description: "A threat intel platform.", url: "https://intel.example.com/" }));
  assert.equal(node["@type"], "SoftwareApplication");
  assert.equal(node.name, "Sentinel APEX");
  assert.equal(node.url, "https://intel.example.com/");
});

test("buildSoftwareApplication: applicationCategory and operatingSystem are fixed, real, defensible values", () => {
  const node = buildSoftwareApplication(makeProduct());
  assert.equal(node.applicationCategory, "SecurityApplication");
  assert.equal(node.operatingSystem, "Web");
});

test("buildSoftwareApplication: provider references Organization by @id", () => {
  const node = buildSoftwareApplication(makeProduct());
  assert.deepEqual(node.provider, { "@id": organizationId() });
});

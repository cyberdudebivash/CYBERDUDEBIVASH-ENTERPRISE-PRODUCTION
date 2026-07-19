import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWebsite, websiteId } from "../builders/websiteBuilder";
import { organizationId } from "../builders/organizationBuilder";

test("buildWebsite: produces the real site's name/url/@id", () => {
  const node = buildWebsite();
  assert.equal(node["@type"], "WebSite");
  assert.equal(node.name, "CyberDudeBivash®");
  assert.equal(node.url, "https://www.cyberdudebivash.com");
  assert.equal(node["@id"], websiteId());
});

test("buildWebsite: description resolves to the real brand description, not fabricated copy", () => {
  const node = buildWebsite();
  assert.match(node.description, /Autonomous AI-powered cybersecurity defense platform/);
});

test("buildWebsite: publisher references Organization by @id", () => {
  const node = buildWebsite();
  assert.deepEqual(node.publisher, { "@id": organizationId() });
});

test("buildWebsite: never sets potentialAction by default", () => {
  const node = buildWebsite();
  assert.equal(node.potentialAction, undefined);
});

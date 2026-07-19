import { test } from "node:test";
import assert from "node:assert/strict";
import { buildService } from "../builders/serviceBuilder";
import { organizationId } from "../builders/organizationBuilder";
import { makeService } from "./fixtures";

test("buildService: composes name/description/url", () => {
  const node = buildService(makeService({ name: "Managed SOC", description: "24/7 SOC.", url: "/soc-services.html" }));
  assert.equal(node["@type"], "Service");
  assert.equal(node.name, "Managed SOC");
  assert.equal(node.url, "https://www.cyberdudebivash.com/soc-services.html");
});

test("buildService: provider references Organization by @id", () => {
  const node = buildService(makeService());
  assert.deepEqual(node.provider, { "@id": organizationId() });
});

test("buildService: a service with no url (the mssp case) gets a fallback @id and an undefined url, not a fabricated page", () => {
  const node = buildService(makeService({ id: "mssp", url: undefined }));
  assert.equal(node.url, undefined);
  assert.match(node["@id"], /#service-mssp$/);
});

test("buildService: areaServed derives from the organization's primary contact point", () => {
  const node = buildService(makeService());
  assert.equal(node.areaServed, "IN");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePageMetadata } from "../../metadata";
import { buildWebPage, buildAboutPage, buildContactPage, webPageId } from "../builders/webPageBuilder";
import { websiteId } from "../builders/websiteBuilder";
import { organizationId } from "../builders/organizationBuilder";
import { makePage } from "./fixtures";

test("buildWebPage: composes title/description/canonical/language from PageMetadata", () => {
  const metadata = generatePageMetadata(makePage({ path: "/services.html", canonical: { path: "/services.html" }, title: "Services", description: "Our services." }));
  const node = buildWebPage(metadata);
  assert.equal(node["@type"], "WebPage");
  assert.equal(node.name, "Services");
  assert.equal(node.description, "Our services.");
  assert.equal(node.url, "https://www.cyberdudebivash.com/services.html");
  assert.equal(node.inLanguage, "en");
  assert.equal(node["@id"], webPageId(metadata));
});

test("buildWebPage: isPartOf references the WebSite by @id", () => {
  const metadata = generatePageMetadata(makePage());
  const node = buildWebPage(metadata);
  assert.deepEqual(node.isPartOf, { "@id": websiteId() });
});

test("buildWebPage: primaryImageOfPage is a resolved ImageObject", () => {
  const metadata = generatePageMetadata(makePage());
  const node = buildWebPage(metadata);
  assert.equal(node.primaryImageOfPage?.["@type"], "ImageObject");
  assert.ok(node.primaryImageOfPage?.url.startsWith("https://"));
});

test("buildAboutPage: narrows @type to AboutPage and sets mainEntity to Organization", () => {
  const metadata = generatePageMetadata(makePage({ id: "about", path: "/about.html", canonical: { path: "/about.html" } }));
  const node = buildAboutPage(metadata);
  assert.equal(node["@type"], "AboutPage");
  assert.deepEqual(node.mainEntity, { "@id": organizationId() });
  assert.equal(node["@id"], webPageId(metadata));
});

test("buildContactPage: narrows @type to ContactPage and sets mainEntity to Organization", () => {
  const metadata = generatePageMetadata(makePage({ id: "contact", path: "/contact.html", canonical: { path: "/contact.html" } }));
  const node = buildContactPage(metadata);
  assert.equal(node["@type"], "ContactPage");
  assert.deepEqual(node.mainEntity, { "@id": organizationId() });
});

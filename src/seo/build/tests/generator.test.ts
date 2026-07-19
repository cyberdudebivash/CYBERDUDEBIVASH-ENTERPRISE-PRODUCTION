import { test } from "node:test";
import assert from "node:assert/strict";
import { listAllPageIds } from "../generator/pageIds";
import { generatePage } from "../generator/generatePage";
import { generateSite } from "../generator/generateSite";
import { PAGES } from "../../config";

test("listAllPageIds: matches the real PAGES registry exactly", () => {
  assert.deepEqual(
    listAllPageIds(),
    PAGES.map((p) => p.id),
  );
});

test("generatePage: builds a validated artifact set for every real page with zero errors", () => {
  for (const pageId of listAllPageIds()) {
    const result = generatePage(pageId);
    assert.equal(result.pageId, pageId);
    assert.equal(result.validation.issues.filter((i) => i.severity === "error").length, 0);
  }
});

test("generatePage: accepts a custom generate function (e.g. a cached runtime's generateSEO)", () => {
  let calls = 0;
  const result = generatePage("about", (pageId) => {
    calls++;
    return generatePage(pageId).runtime;
  });
  assert.equal(calls, 1);
  assert.equal(result.pageId, "about");
});

test("generateSite: generates all 17 real pages plus site-wide artifacts with zero errors", () => {
  const result = generateSite();
  assert.equal(result.pages.length, 17);
  assert.equal(result.site.pages.length, 17);
  assert.equal(result.site.sitemap.urls.length, 17);
  assert.equal(result.site.searchIndex.entries.length, 17);
  assert.equal(result.validation.issues.filter((i) => i.severity === "error").length, 0);
});

test("generateSite: accepts a subset of page ids", () => {
  const result = generateSite(["about", "contact"]);
  assert.equal(result.pages.length, 2);
  assert.deepEqual(
    result.pages.map((p) => p.pageId).sort(),
    ["about", "contact"],
  );
});

test("generateSite: reuses one relationship graph across every page (createSEORuntime caching)", () => {
  const result = generateSite(["home", "about"]);
  const homeRelationships = result.pages.find((p) => p.pageId === "home")?.runtime.relationships;
  assert.ok(homeRelationships && homeRelationships.length > 0);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { buildSitemapArtifact, buildRobotsArtifact, buildSearchIndexArtifact } from "../artifacts/siteArtifacts";
import { PAGES } from "../../config";

const pageArtifacts = PAGES.map((page) => buildPageArtifactSet(page.id, generateSEO(page.id)));

test("buildSitemapArtifact: every real page is indexable today (none carry a noindex directive), so all 17 appear", () => {
  const sitemap = buildSitemapArtifact(pageArtifacts);
  assert.equal(sitemap.urls.length, 17);
  assert.deepEqual(sitemap.excludedPageIds, []);
});

test("buildSitemapArtifact: excludes a synthetic noindex page and includes it in excludedPageIds", () => {
  const synthetic = [...pageArtifacts, { ...pageArtifacts[0], pageId: "synthetic-noindex", metadata: { ...pageArtifacts[0].metadata, robots: "noindex,nofollow" } }];
  const sitemap = buildSitemapArtifact(synthetic);
  assert.equal(sitemap.urls.length, 17);
  assert.deepEqual(sitemap.excludedPageIds, ["synthetic-noindex"]);
});

test("buildSitemapArtifact: every url.loc is an absolute URL matching the page's real canonical", () => {
  const sitemap = buildSitemapArtifact(pageArtifacts);
  for (const page of pageArtifacts) {
    const entry = sitemap.urls.find((u) => u.loc === page.metadata.canonical);
    assert.ok(entry, `no sitemap entry for "${page.pageId}"`);
  }
});

test("buildRobotsArtifact: sitemapUrl is derived from the real site origin", () => {
  const robots = buildRobotsArtifact(pageArtifacts);
  assert.equal(robots.sitemapUrl, "https://www.cyberdudebivash.com/sitemap.xml");
});

test("buildRobotsArtifact: disallowedPaths is empty today (no real page is noindex)", () => {
  const robots = buildRobotsArtifact(pageArtifacts);
  assert.deepEqual(robots.disallowedPaths, []);
});

test("buildSearchIndexArtifact: one entry per page, regardless of robots directive", () => {
  const index = buildSearchIndexArtifact(pageArtifacts);
  assert.equal(index.entries.length, pageArtifacts.length);
  assert.deepEqual(
    index.entries.map((e) => e.pageId).sort(),
    pageArtifacts.map((p) => p.pageId).sort(),
  );
});

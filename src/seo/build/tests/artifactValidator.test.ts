import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { buildSitemapArtifact, buildRobotsArtifact, buildSearchIndexArtifact } from "../artifacts/siteArtifacts";
import { validatePageArtifactSet, validateSiteArtifacts, validateBuildManifest } from "../validators/artifactValidator";
import { buildManifest } from "../manifests/buildManifest";
import { PAGES } from "../../config";

test("validatePageArtifactSet: zero errors for every real page's artifacts", () => {
  for (const page of PAGES) {
    const set = buildPageArtifactSet(page.id, generateSEO(page.id));
    const result = validatePageArtifactSet(set);
    assert.equal(result.issues.filter((i) => i.severity === "error").length, 0);
  }
});

test("validatePageArtifactSet: flags a non-absolute canonical", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const broken = { ...set, metadata: { ...set.metadata, canonical: "/about.html" } };
  const result = validatePageArtifactSet(broken);
  assert.ok(result.issues.some((i) => i.code === "ARTIFACT_CANONICAL_NOT_ABSOLUTE"));
});

test("validatePageArtifactSet: flags a schema/nodeCount mismatch", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const broken = { ...set, jsonLd: { ...set.jsonLd, nodeCount: set.jsonLd.nodeCount + 1 } };
  const result = validatePageArtifactSet(broken);
  assert.ok(result.issues.some((i) => i.code === "ARTIFACT_SCHEMA_NODE_COUNT_MISMATCH"));
});

test("validatePageArtifactSet: flags invalid JSON", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const broken = { ...set, jsonLd: { ...set.jsonLd, json: "{not valid json" } };
  const result = validatePageArtifactSet(broken);
  assert.ok(result.issues.some((i) => i.code === "ARTIFACT_INVALID_JSON"));
});

test("validateSiteArtifacts: zero errors for the real, full site", () => {
  const pages = PAGES.map((page) => buildPageArtifactSet(page.id, generateSEO(page.id)));
  const site = {
    pages,
    sitemap: buildSitemapArtifact(pages),
    robots: buildRobotsArtifact(pages),
    searchIndex: buildSearchIndexArtifact(pages),
  };
  const result = validateSiteArtifacts(site);
  assert.equal(result.issues.filter((i) => i.severity === "error").length, 0);
});

test("validateSiteArtifacts: flags a duplicate sitemap URL", () => {
  const pages = PAGES.slice(0, 2).map((page) => buildPageArtifactSet(page.id, generateSEO(page.id)));
  const sitemap = buildSitemapArtifact(pages);
  const duplicated = { ...sitemap, urls: [...sitemap.urls, sitemap.urls[0]] };
  const site = { pages, sitemap: duplicated, robots: buildRobotsArtifact(pages), searchIndex: buildSearchIndexArtifact(pages) };
  const result = validateSiteArtifacts(site);
  assert.ok(result.issues.some((i) => i.code === "ARTIFACT_SITEMAP_DUPLICATE_URL"));
});

test("validateBuildManifest: flags a duplicate pageId", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const validation = validatePageArtifactSet(set);
  const manifest = buildManifest({
    mode: "single-page",
    outDir: "dist/seo",
    pages: [
      { pageId: "about", artifacts: set, artifactPaths: [], validation },
      { pageId: "about", artifacts: set, artifactPaths: [], validation },
    ],
    siteArtifacts: [],
    durationMs: 1,
  });
  const result = validateBuildManifest(manifest);
  assert.ok(result.issues.some((i) => i.code === "ARTIFACT_MANIFEST_DUPLICATE_PAGE"));
});

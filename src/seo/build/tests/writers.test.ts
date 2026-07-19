import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { buildSitemapArtifact, buildRobotsArtifact, buildSearchIndexArtifact } from "../artifacts/siteArtifacts";
import { writeMetadataArtifact } from "../writers/metadataWriter";
import { writeJsonLdArtifact } from "../writers/schemaWriter";
import { writeSitemapArtifact, renderSitemapXml } from "../writers/sitemapWriter";
import { writeRobotsArtifact, renderRobotsTxt } from "../writers/robotsWriter";
import { writeSearchIndexArtifact } from "../writers/searchIndexWriter";
import { PAGES } from "../../config";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "seo-build-writer-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("writeMetadataArtifact: writes valid JSON matching the artifact exactly", async () => {
  await withTempDir(async (dir) => {
    const artifact = buildPageArtifactSet("about", generateSEO("about")).metadata;
    const relativePath = await writeMetadataArtifact(dir, artifact);
    assert.equal(relativePath, "metadata/about.json");
    const written = JSON.parse(await readFile(join(dir, relativePath), "utf-8"));
    assert.deepEqual(written, artifact);
  });
});

test("writeJsonLdArtifact: writes the exact jsonLd string verbatim", async () => {
  await withTempDir(async (dir) => {
    const artifact = buildPageArtifactSet("home", generateSEO("home")).jsonLd;
    const relativePath = await writeJsonLdArtifact(dir, artifact);
    const written = await readFile(join(dir, relativePath), "utf-8");
    assert.equal(written, artifact.json);
  });
});

test("renderSitemapXml: produces well-formed XML with one <url> per entry", () => {
  const pages = PAGES.map((page) => buildPageArtifactSet(page.id, generateSEO(page.id)));
  const sitemap = buildSitemapArtifact(pages);
  const xml = renderSitemapXml(sitemap);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.equal((xml.match(/<url>/g) ?? []).length, sitemap.urls.length);
  assert.equal((xml.match(/<\/url>/g) ?? []).length, sitemap.urls.length);
});

test("renderSitemapXml: escapes special characters in a loc", () => {
  const xml = renderSitemapXml({ urls: [{ loc: "https://example.com/?a=1&b=2", alternates: [] }], excludedPageIds: [] });
  assert.ok(xml.includes("&amp;"));
  assert.ok(!xml.includes("&b=2<"));
});

test("writeSitemapArtifact: writes to sitemaps/sitemap.xml", async () => {
  await withTempDir(async (dir) => {
    const relativePath = await writeSitemapArtifact(dir, { urls: [], excludedPageIds: [] });
    assert.equal(relativePath, "sitemaps/sitemap.xml");
  });
});

test("renderRobotsTxt: includes a Disallow line per disallowed path and a Sitemap: reference", () => {
  const text = renderRobotsTxt({ sitemapUrl: "https://example.com/sitemap.xml", disallowedPaths: ["/private.html"] });
  assert.ok(text.includes("Disallow: /private.html"));
  assert.ok(text.includes("Sitemap: https://example.com/sitemap.xml"));
});

test("writeRobotsArtifact: writes to robots.txt at the outDir root", async () => {
  await withTempDir(async (dir) => {
    const relativePath = await writeRobotsArtifact(dir, { sitemapUrl: "", disallowedPaths: [] });
    assert.equal(relativePath, "robots.txt");
  });
});

test("writeSearchIndexArtifact: writes valid JSON with one entry per page", async () => {
  await withTempDir(async (dir) => {
    const pages = PAGES.map((page) => buildPageArtifactSet(page.id, generateSEO(page.id)));
    const artifact = buildSearchIndexArtifact(pages);
    const relativePath = await writeSearchIndexArtifact(dir, artifact);
    const written = JSON.parse(await readFile(join(dir, relativePath), "utf-8"));
    assert.equal(written.entries.length, 17);
  });
});

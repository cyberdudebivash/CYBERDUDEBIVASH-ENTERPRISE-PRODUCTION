import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { runBuild } from "../generator/runBuild";
import { BuildValidationError } from "../validators/errors";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "seo-build-run-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("runBuild: 'single-page' mode requires pageId", async () => {
  await assert.rejects(() => runBuild({ mode: "single-page" }), BuildValidationError);
});

test("runBuild: 'single-page' mode writes exactly metadata, schema, manifest, and report", async () => {
  await withTempDir(async (dir) => {
    const result = await runBuild({ mode: "single-page", pageId: "about", outDir: dir });
    assert.deepEqual(result.writtenPaths.sort(), ["manifests/build-manifest.json", "metadata/about.json", "reports/BUILD_REPORT.md", "schema/about.json"].sort());
    await access(join(dir, "metadata/about.json"));
    await access(join(dir, "schema/about.json"));
  });
});

test("runBuild: 'full-site' mode writes every real page plus sitemap/robots/search-index", async () => {
  await withTempDir(async (dir) => {
    const result = await runBuild({ mode: "full-site", outDir: dir });
    assert.equal(result.manifest.summary.totalPages, 17);
    assert.equal(result.manifest.summary.invalidPages, 0);
    await access(join(dir, "sitemaps/sitemap.xml"));
    await access(join(dir, "robots.txt"));
    await access(join(dir, "search-index.json"));
  });
});

test("runBuild: 'full-site' mode's report includes a Runtime Summary by default", async () => {
  await withTempDir(async (dir) => {
    await runBuild({ mode: "full-site", outDir: dir });
    const report = await readFile(join(dir, "reports/BUILD_REPORT.md"), "utf-8");
    assert.ok(report.includes("## Runtime Summary"));
  });
});

test("runBuild: 'incremental' mode with no previous manifest generates every page (equivalent to full regeneration)", async () => {
  await withTempDir(async (dir) => {
    const result = await runBuild({ mode: "incremental", outDir: dir });
    assert.equal(result.manifest.summary.skippedPages, 0);
    assert.equal(result.manifest.summary.totalPages, 17);
  });
});

test("runBuild: a second 'incremental' run against unchanged content skips every page and only rewrites site-wide artifacts + manifest + report", async () => {
  await withTempDir(async (dir) => {
    await runBuild({ mode: "incremental", outDir: dir });
    const second = await runBuild({ mode: "incremental", outDir: dir });
    assert.equal(second.manifest.summary.skippedPages, 17);
    assert.deepEqual(second.writtenPaths.sort(), ["manifests/build-manifest.json", "reports/BUILD_REPORT.md", "robots.txt", "search-index.json", "sitemaps/sitemap.xml"].sort());
  });
});

test("runBuild: a skipped page's manifest entry carries its checksum and generatedAt forward, unchanged", async () => {
  await withTempDir(async (dir) => {
    const first = await runBuild({ mode: "incremental", outDir: dir });
    const firstAboutEntry = first.manifest.pages.find((p) => p.pageId === "about")!;
    const second = await runBuild({ mode: "incremental", outDir: dir });
    const secondAboutEntry = second.manifest.pages.find((p) => p.pageId === "about")!;
    assert.equal(secondAboutEntry.checksum, firstAboutEntry.checksum);
    assert.equal(secondAboutEntry.generatedAt, firstAboutEntry.generatedAt);
    assert.equal(secondAboutEntry.skipped, true);
  });
});

test("runBuild: incremental regenerates only the subset of pageIds explicitly passed in", async () => {
  await withTempDir(async (dir) => {
    await runBuild({ mode: "full-site", outDir: dir });
    const result = await runBuild({ mode: "incremental", outDir: dir, pageIds: ["about", "contact"] });
    assert.equal(result.manifest.summary.totalPages, 2);
  });
});

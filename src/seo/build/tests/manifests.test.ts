import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { validatePageArtifactSet } from "../validators/artifactValidator";
import { checksumOf } from "../manifests/checksum";
import { buildManifest } from "../manifests/buildManifest";
import { readManifest } from "../manifests/readManifest";
import { writeBuildManifest } from "../writers/manifestWriter";

test("checksumOf: identical input twice produces the identical checksum", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  assert.equal(checksumOf(set), checksumOf(set));
  assert.equal(checksumOf(JSON.parse(JSON.stringify(set))), checksumOf(set));
});

test("checksumOf: different pages produce different checksums", () => {
  const about = buildPageArtifactSet("about", generateSEO("about"));
  const contact = buildPageArtifactSet("contact", generateSEO("contact"));
  assert.notEqual(checksumOf(about), checksumOf(contact));
});

test("buildManifest: summary counts match the pages actually passed in", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const validation = validatePageArtifactSet(set);
  const manifest = buildManifest({
    mode: "single-page",
    outDir: "dist/seo",
    pages: [{ pageId: "about", artifacts: set, artifactPaths: ["metadata/about.json"], validation }],
    siteArtifacts: [],
    durationMs: 12.5,
  });
  assert.equal(manifest.summary.totalPages, 1);
  assert.equal(manifest.summary.validPages, 1);
  assert.equal(manifest.summary.invalidPages, 0);
  assert.equal(manifest.summary.skippedPages, 0);
  assert.equal(manifest.summary.durationMs, 12.5);
  assert.equal(manifest.pages[0].checksum, checksumOf(set));
});

test("buildManifest: a skipped page entry carries its overridden generatedAt forward", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const validation = validatePageArtifactSet(set);
  const manifest = buildManifest({
    mode: "incremental",
    outDir: "dist/seo",
    pages: [{ pageId: "about", artifacts: set, artifactPaths: [], validation, skipped: true, generatedAt: "2020-01-01T00:00:00.000Z" }],
    siteArtifacts: [],
    durationMs: 1,
  });
  assert.equal(manifest.pages[0].skipped, true);
  assert.equal(manifest.pages[0].generatedAt, "2020-01-01T00:00:00.000Z");
  assert.equal(manifest.summary.skippedPages, 1);
});

test("readManifest: returns undefined for a path that does not exist", async () => {
  const result = await readManifest("/nonexistent/path/build-manifest.json");
  assert.equal(result, undefined);
});

test("readManifest: round-trips a manifest written by writeBuildManifest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seo-build-manifest-"));
  try {
    const set = buildPageArtifactSet("about", generateSEO("about"));
    const validation = validatePageArtifactSet(set);
    const manifest = buildManifest({
      mode: "single-page",
      outDir: dir,
      pages: [{ pageId: "about", artifacts: set, artifactPaths: [], validation }],
      siteArtifacts: [],
      durationMs: 1,
    });
    await writeBuildManifest(dir, manifest);
    const roundTripped = await readManifest(join(dir, "manifests/build-manifest.json"));
    assert.deepEqual(roundTripped, manifest);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

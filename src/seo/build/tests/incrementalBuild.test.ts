import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePage } from "../generator/generatePage";
import { partitionForIncrementalBuild } from "../generator/incrementalBuild";
import { checksumOf } from "../manifests/checksum";
import type { BuildManifest } from "../manifests/types";

function fakeManifest(entries: Array<{ pageId: string; checksum: string }>): BuildManifest {
  return {
    schemaVersion: "1.0.0",
    mode: "incremental",
    generatedAt: new Date().toISOString(),
    outDir: "dist/seo",
    pages: entries.map((e) => ({ pageId: e.pageId, checksum: e.checksum, generatedAt: new Date().toISOString(), artifactPaths: [], validationStatus: "valid", errorCount: 0, warningCount: 0, skipped: false })),
    siteArtifacts: [],
    summary: { totalPages: entries.length, validPages: entries.length, invalidPages: 0, skippedPages: 0, totalErrors: 0, totalWarnings: 0, durationMs: 0 },
  };
}

test("partitionForIncrementalBuild: everything is 'changed' when there is no previous manifest", () => {
  const about = generatePage("about");
  const { changed, unchanged } = partitionForIncrementalBuild([about], undefined);
  assert.equal(changed.length, 1);
  assert.equal(unchanged.length, 0);
});

test("partitionForIncrementalBuild: a page is 'unchanged' when its checksum matches the previous manifest", () => {
  const about = generatePage("about");
  const manifest = fakeManifest([{ pageId: "about", checksum: checksumOf(about.artifacts) }]);
  const { changed, unchanged } = partitionForIncrementalBuild([about], manifest);
  assert.equal(changed.length, 0);
  assert.equal(unchanged.length, 1);
});

test("partitionForIncrementalBuild: a page is 'changed' when its checksum differs from the previous manifest", () => {
  const about = generatePage("about");
  const manifest = fakeManifest([{ pageId: "about", checksum: "stale-checksum-from-a-different-content" }]);
  const { changed, unchanged } = partitionForIncrementalBuild([about], manifest);
  assert.equal(changed.length, 1);
  assert.equal(unchanged.length, 0);
});

test("partitionForIncrementalBuild: a page absent from the previous manifest is 'changed' (new page)", () => {
  const contact = generatePage("contact");
  const manifest = fakeManifest([{ pageId: "about", checksum: "irrelevant" }]);
  const { changed, unchanged } = partitionForIncrementalBuild([contact], manifest);
  assert.equal(changed.length, 1);
  assert.equal(unchanged.length, 0);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { runBuild } from "../generator/runBuild";
import { generateSite } from "../generator/generateSite";
import { PAGES } from "../../config";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "seo-build-regression-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("regression: the 'vciso' page (Phase 1.3's documented page/service id collision) builds without error through the Build Platform too", () => {
  const result = generateSite(["vciso"]);
  assert.equal(result.validation.issues.filter((i) => i.severity === "error").length, 0);
});

test("regression: total schema node count across all 17 pages' JSON-LD artifacts matches the Runtime's own documented total (81 nodes)", () => {
  const result = generateSite();
  const total = result.pages.reduce((sum, page) => sum + page.artifacts.jsonLd.nodeCount, 0);
  assert.equal(total, 81);
});

test("regression: a full-site build never modifies PAGES or any other shared config array as a side effect", () => {
  const before = JSON.stringify(PAGES);
  generateSite();
  assert.equal(JSON.stringify(PAGES), before);
});

test("regression: two full-site builds against unchanged content produce byte-identical artifact checksums (determinism)", () => {
  const first = generateSite();
  const second = generateSite();
  for (const page of first.pages) {
    const match = second.pages.find((p) => p.pageId === page.pageId);
    assert.deepEqual(match?.artifacts, page.artifacts);
  }
});

test("regression: runBuild never writes outside its own outDir", async () => {
  await withTempDir(async (dir) => {
    const result = await runBuild({ mode: "full-site", outDir: dir });
    for (const path of result.writtenPaths) {
      assert.ok(!path.startsWith("/"), `written path "${path}" looks absolute, not outDir-relative`);
      assert.ok(!path.includes(".."), `written path "${path}" escapes outDir`);
    }
  });
});

test("regression: the generated robots.txt references the generated sitemap.xml by absolute URL", async () => {
  await withTempDir(async (dir) => {
    await runBuild({ mode: "full-site", outDir: dir });
    const robots = await readFile(join(dir, "robots.txt"), "utf-8");
    assert.ok(robots.includes("Sitemap: https://www.cyberdudebivash.com/sitemap.xml"));
  });
});

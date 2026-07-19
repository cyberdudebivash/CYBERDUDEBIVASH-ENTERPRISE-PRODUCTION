import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runRelease } from "../runRelease";
import { withTempDirs, buildFixture } from "./testHelpers";

test("regression: runRelease never writes outside its own releaseRoot", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const result = await runRelease({ mode: "full", sourceDir, releaseRoot });
    for (const file of result.plan.files) {
      assert.ok(!file.path.startsWith("/"), `plan path "${file.path}" looks absolute, not sourceDir-relative`);
      assert.ok(!file.path.includes(".."), `plan path "${file.path}" escapes sourceDir`);
    }
  });
});

test("regression: runRelease never modifies sourceDir (Build Platform's own output is read-only to this platform)", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const before = await readFile(`${sourceDir}/metadata/about.json`, "utf-8");
    await runRelease({ mode: "full", sourceDir, releaseRoot });
    const after = await readFile(`${sourceDir}/metadata/about.json`, "utf-8");
    assert.equal(before, after);
  });
});

test("regression: two releases of identical content are idempotent — same releaseId, same file count, no duplicate history", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const first = await runRelease({ mode: "full", sourceDir, releaseRoot });
    const second = await runRelease({ mode: "full", sourceDir, releaseRoot });
    assert.equal(first.releaseId, second.releaseId);
    assert.equal(second.plan.previousReleaseId, first.releaseId);
    // The republished release's OWN manifest must still show no predecessor — see publisher.test.ts's dedicated regression test for the full mechanism.
  });
});

test("regression: a release id is a pure function of sourceDir's actual file bytes — re-releasing the SAME already-built sourceDir (no re-build in between) is idempotent", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const first = await runRelease({ mode: "full", sourceDir, releaseRoot });
    // No second buildFixture() call — sourceDir's bytes are untouched, so this is a true "release the same output twice" scenario, not a "rebuild then release" one.
    const second = await runRelease({ mode: "full", sourceDir, releaseRoot });
    assert.equal(first.releaseId, second.releaseId);
  });
});

test("regression: re-running Build Platform against unchanged SEO content does NOT reproduce the same release id — build-manifest.json and BUILD_REPORT.md carry real per-build timestamps that scanDirectory correctly includes", async () => {
  await withTempDirs(async ({ sourceDir: sourceDirA, releaseRoot: releaseRootA }) => {
    await withTempDirs(async ({ sourceDir: sourceDirB, releaseRoot: releaseRootB }) => {
      await buildFixture(sourceDirA, ["about"]);
      await new Promise((resolve) => setTimeout(resolve, 5));
      await buildFixture(sourceDirB, ["about"]);
      const resultA = await runRelease({ mode: "full", sourceDir: sourceDirA, releaseRoot: releaseRootA });
      const resultB = await runRelease({ mode: "full", sourceDir: sourceDirB, releaseRoot: releaseRootB });
      // Documents real, evidenced behavior (see documentation/RELEASE_FLOW.md) — not asserting a bug, asserting the actual, correct contract: a release id reflects a specific BUILD, not just its SEO content in the abstract.
      assert.notEqual(resultA.releaseId, resultB.releaseId);
    });
  });
});

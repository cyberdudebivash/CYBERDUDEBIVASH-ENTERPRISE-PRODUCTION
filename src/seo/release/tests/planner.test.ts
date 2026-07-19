import { test } from "node:test";
import assert from "node:assert/strict";
import { scanDirectory } from "../planner/scanDirectory";
import { computeReleaseId } from "../planner/computeReleaseId";
import { createReleasePlan } from "../planner/createReleasePlan";
import { readBuildManifest, toSourceBuildInfo } from "../planner/readBuildManifest";
import { withTempDirs, buildFixture } from "./testHelpers";

test("scanDirectory: finds every file Build Platform wrote, sorted by path", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const files = await scanDirectory(sourceDir);
    assert.ok(files.some((f) => f.path === "metadata/about.json"));
    assert.ok(files.some((f) => f.path === "manifests/build-manifest.json"));
    assert.deepEqual(
      files.map((f) => f.path),
      [...files.map((f) => f.path)].sort(),
    );
  });
});

test("scanDirectory: is deterministic — scanning the same directory twice yields identical checksums", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const first = await scanDirectory(sourceDir);
    const second = await scanDirectory(sourceDir);
    assert.deepEqual(first, second);
  });
});

test("computeReleaseId: identical file sets produce the identical id, regardless of input order", () => {
  const a = [{ path: "x.json", checksum: "111" }, { path: "y.json", checksum: "222" }];
  const b = [{ path: "y.json", checksum: "222" }, { path: "x.json", checksum: "111" }];
  assert.equal(computeReleaseId(a), computeReleaseId(b));
});

test("computeReleaseId: different content produces a different id", () => {
  const a = [{ path: "x.json", checksum: "111" }];
  const b = [{ path: "x.json", checksum: "999" }];
  assert.notEqual(computeReleaseId(a), computeReleaseId(b));
});

test("readBuildManifest + toSourceBuildInfo: reads the real build-manifest.json Build Platform wrote", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const manifest = await readBuildManifest(sourceDir);
    const info = toSourceBuildInfo(manifest);
    assert.equal(info.schemaVersion, "1.0.0");
    assert.equal(info.totalErrors, 0);
  });
});

test("createReleasePlan: with no previous release, every file is 'added' and none removed", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    assert.equal(plan.filesUpdated.length, 0);
    assert.equal(plan.filesUnchanged.length, 0);
    assert.deepEqual(plan.filesRemoved, []);
    assert.equal(plan.filesAdded.length, plan.files.length);
    assert.equal(plan.previousReleaseId, undefined);
  });
});

test("createReleasePlan: performs no filesystem mutation (sourceDir is untouched)", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const before = await scanDirectory(sourceDir);
    await createReleasePlan(sourceDir, undefined);
    const after = await scanDirectory(sourceDir);
    assert.deepEqual(before, after);
  });
});

test("createReleasePlan: diffs correctly against a synthetic previous manifest", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const files = await scanDirectory(sourceDir);
    const unchangedPath = files[0].path;
    const removedPath = "metadata/does-not-exist-anymore.json";

    const previous = {
      releaseId: "rel-fake-previous",
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      sourceDir,
      previousReleaseId: undefined,
      build: { schemaVersion: "1.0.0", mode: "full-site", generatedAt: new Date().toISOString(), totalErrors: 0, totalWarnings: 0, invalidPages: 0 },
      files: [
        { path: unchangedPath, checksum: files[0].checksum },
        { path: removedPath, checksum: "stale-checksum" },
      ],
    };

    const plan = await createReleasePlan(sourceDir, previous);
    assert.ok(plan.filesUnchanged.some((f) => f.path === unchangedPath));
    assert.deepEqual(plan.filesRemoved, [removedPath]);
    assert.equal(plan.previousReleaseId, "rel-fake-previous");
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { createReleasePlan } from "../planner/createReleasePlan";
import { stageRelease } from "../staging/stageRelease";
import { scanDirectory } from "../planner/scanDirectory";
import { publishRelease } from "../publisher/publishRelease";
import { withTempDirs, buildFixture } from "./testHelpers";

test("stageRelease: 'full' mode copies every file from the plan into an isolated staging dir", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    assert.equal(staged.copiedPaths.length, plan.files.length);
    assert.equal(staged.linkedPaths.length, 0);
    const stagedFiles = await scanDirectory(staged.stagingDir);
    assert.deepEqual(
      stagedFiles.map((f) => f.checksum).sort(),
      plan.files.map((f) => f.checksum).sort(),
    );
  });
});

test("stageRelease: never touches the currently published release", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan1 = await createReleasePlan(sourceDir, undefined);
    const staged1 = await stageRelease(plan1, releaseRoot, "full");
    const published1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);

    await buildFixture(sourceDir, ["about", "contact"]);
    const plan2 = await createReleasePlan(sourceDir, published1);
    await stageRelease(plan2, releaseRoot, "full");

    // The already-published release's own directory must be unaffected by staging a second release.
    // +1 accounts for RELEASE_MANIFEST.json, which publishRelease() writes into the release
    // directory itself — it's never part of plan1.files (sourceDir never contains it).
    const stillThere = await scanDirectory(join(releaseRoot, "releases", published1.releaseId));
    assert.equal(stillThere.length, plan1.files.length + 1);
  });
});

test("stageRelease: 'incremental' mode hard-links unchanged files from the previous release instead of copying them", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const plan1 = await createReleasePlan(sourceDir, undefined);
    const staged1 = await stageRelease(plan1, releaseRoot, "full");
    const manifest1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);

    await buildFixture(sourceDir, ["about", "contact", "home"]);
    const plan2 = await createReleasePlan(sourceDir, manifest1);
    assert.ok(plan2.filesUnchanged.length > 0, "expected at least one unchanged file across a small page-set addition");

    const staged2 = await stageRelease(plan2, releaseRoot, "incremental");
    assert.ok(staged2.linkedPaths.length > 0);
    assert.equal(staged2.linkedPaths.length + staged2.copiedPaths.length, plan2.files.length);

    // A hard-linked file must share the same inode as the previous release's copy.
    const linkedPath = staged2.linkedPaths[0];
    const previousInode = statSync(join(releaseRoot, "releases", manifest1.releaseId, linkedPath)).ino;
    const stagedInode = statSync(join(staged2.stagingDir, linkedPath)).ino;
    assert.equal(previousInode, stagedInode);
  });
});

test("stageRelease: 'incremental' mode with no previous release falls back to copying everything", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "incremental");
    assert.equal(staged.copiedPaths.length, plan.files.length);
    assert.equal(staged.linkedPaths.length, 0);
  });
});

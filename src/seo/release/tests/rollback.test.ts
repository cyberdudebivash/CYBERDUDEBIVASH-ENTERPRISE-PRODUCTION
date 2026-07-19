import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createReleasePlan } from "../planner/createReleasePlan";
import { stageRelease } from "../staging/stageRelease";
import { publishRelease } from "../publisher/publishRelease";
import { readCurrentPointer } from "../publisher/readReleaseState";
import { releaseDir } from "../publisher/layout";
import { rollbackRelease } from "../rollback/rollbackRelease";
import { ReleaseRollbackError } from "../rollback/errors";
import { withTempDirs, buildFixture } from "./testHelpers";

async function publishTwoReleases(sourceDir: string, releaseRoot: string) {
  await buildFixture(sourceDir, ["about"]);
  const plan1 = await createReleasePlan(sourceDir, undefined);
  const staged1 = await stageRelease(plan1, releaseRoot, "full");
  const manifest1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);

  await buildFixture(sourceDir, ["about", "contact"]);
  const plan2 = await createReleasePlan(sourceDir, manifest1);
  const staged2 = await stageRelease(plan2, releaseRoot, "full");
  const manifest2 = await publishRelease(plan2, staged2.stagingDir, releaseRoot);

  return { manifest1, manifest2 };
}

test("rollbackRelease: 'latest' with no current release throws ReleaseRollbackError", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    await assert.rejects(() => rollbackRelease(releaseRoot, "latest", false), ReleaseRollbackError);
  });
});

test("rollbackRelease: 'latest' with only one release ever published throws (no history to roll back to)", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    await publishRelease(plan, staged.stagingDir, releaseRoot);
    await assert.rejects(() => rollbackRelease(releaseRoot, "latest", false), ReleaseRollbackError);
  });
});

test("rollbackRelease: 'latest' repoints current.json at the previous release", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    const { manifest1, manifest2 } = await publishTwoReleases(sourceDir, releaseRoot);
    const result = await rollbackRelease(releaseRoot, "latest", false);
    assert.equal(result.fromReleaseId, manifest2.releaseId);
    assert.equal(result.toReleaseId, manifest1.releaseId);
    const pointer = await readCurrentPointer(releaseRoot);
    assert.equal(pointer?.releaseId, manifest1.releaseId);
  });
});

test("rollbackRelease: dry run reports the target but never touches current.json", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    const { manifest1, manifest2 } = await publishTwoReleases(sourceDir, releaseRoot);
    const result = await rollbackRelease(releaseRoot, "latest", true);
    assert.equal(result.toReleaseId, manifest1.releaseId);
    assert.equal(result.dryRun, true);
    const pointer = await readCurrentPointer(releaseRoot);
    assert.equal(pointer?.releaseId, manifest2.releaseId);
  });
});

test("rollbackRelease: rolling back by explicit releaseId works even for an id further back in history", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    const { manifest1 } = await publishTwoReleases(sourceDir, releaseRoot);
    const result = await rollbackRelease(releaseRoot, { releaseId: manifest1.releaseId }, false);
    assert.equal(result.toReleaseId, manifest1.releaseId);
  });
});

test("rollbackRelease: an unknown releaseId throws ReleaseRollbackError", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await publishTwoReleases(sourceDir, releaseRoot);
    await assert.rejects(() => rollbackRelease(releaseRoot, { releaseId: "rel-never-existed" }, false), ReleaseRollbackError);
  });
});

test("rollbackRelease: refuses to roll back to a release whose files were tampered with (integrity verification before rollback)", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    const { manifest1 } = await publishTwoReleases(sourceDir, releaseRoot);
    await writeFile(join(releaseDir(releaseRoot, manifest1.releaseId), "metadata", "about.json"), "{}", "utf-8");
    await assert.rejects(() => rollbackRelease(releaseRoot, { releaseId: manifest1.releaseId }, false), ReleaseRollbackError);
    // current.json must be unaffected by the failed rollback attempt.
    const pointer = await readCurrentPointer(releaseRoot);
    assert.notEqual(pointer?.releaseId, manifest1.releaseId);
  });
});

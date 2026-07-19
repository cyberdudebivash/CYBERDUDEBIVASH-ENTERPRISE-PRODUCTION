import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createReleasePlan } from "../planner/createReleasePlan";
import { stageRelease } from "../staging/stageRelease";
import { publishRelease } from "../publisher/publishRelease";
import { releaseDir } from "../publisher/layout";
import { acquireLock } from "../locking/releaseLock";
import { getReleaseHealth } from "../health/releaseHealth";
import { withTempDirs, buildFixture } from "./testHelpers";

test("getReleaseHealth: 'warning' with a reason when nothing has ever been published", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const health = await getReleaseHealth(releaseRoot);
    assert.equal(health.status, "warning");
    assert.equal(health.currentReleaseId, undefined);
    assert.ok(health.reasons.some((r) => r.includes("no release has been published")));
  });
});

test("getReleaseHealth: 'healthy' immediately after a clean publish", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    await publishRelease(plan, staged.stagingDir, releaseRoot);

    const health = await getReleaseHealth(releaseRoot);
    assert.equal(health.status, "healthy");
    assert.deepEqual(health.reasons, []);
  });
});

test("getReleaseHealth: 'blocked' when the current release's files were tampered with", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    const manifest = await publishRelease(plan, staged.stagingDir, releaseRoot);

    await writeFile(join(releaseDir(releaseRoot, manifest.releaseId), "metadata", "about.json"), "{}", "utf-8");

    const health = await getReleaseHealth(releaseRoot);
    assert.equal(health.status, "blocked");
    assert.ok(health.reasons.some((r) => r.includes("failed integrity verification")));
  });
});

test("getReleaseHealth: reports lockHeld and contributes a 'warning' when a lock is held", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    await acquireLock(releaseRoot);
    const health = await getReleaseHealth(releaseRoot);
    assert.equal(health.lockHeld, true);
    assert.equal(health.status, "warning");
  });
});

test("getReleaseHealth: is deterministic — the same state always produces the same reasons", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const first = await getReleaseHealth(releaseRoot);
    const second = await getReleaseHealth(releaseRoot);
    assert.deepEqual(first, second);
  });
});

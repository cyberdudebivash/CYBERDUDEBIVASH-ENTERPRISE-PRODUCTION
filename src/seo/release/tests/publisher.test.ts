import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { createReleasePlan } from "../planner/createReleasePlan";
import { stageRelease } from "../staging/stageRelease";
import { publishRelease, repointCurrent } from "../publisher/publishRelease";
import { readCurrentPointer, readReleaseManifest } from "../publisher/readReleaseState";
import { releaseManifestPath } from "../publisher/layout";
import { withTempDirs, buildFixture } from "./testHelpers";

test("publishRelease: promotes the staged directory and writes current.json", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    const manifest = await publishRelease(plan, staged.stagingDir, releaseRoot);

    assert.equal(manifest.releaseId, plan.releaseId);
    await access(join(releaseRoot, "releases", plan.releaseId, "metadata", "about.json"));
    const pointer = await readCurrentPointer(releaseRoot);
    assert.equal(pointer?.releaseId, plan.releaseId);
  });
});

test("publishRelease: the first-ever release records previousReleaseId as undefined", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const staged = await stageRelease(plan, releaseRoot, "full");
    const manifest = await publishRelease(plan, staged.stagingDir, releaseRoot);
    assert.equal(manifest.previousReleaseId, undefined);
  });
});

test("regression: republishing identical content never overwrites the release's own RELEASE_MANIFEST.json (previousReleaseId must not become self-referential)", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan1 = await createReleasePlan(sourceDir, undefined);
    const staged1 = await stageRelease(plan1, releaseRoot, "full");
    const manifest1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);
    assert.equal(manifest1.previousReleaseId, undefined);

    // Republish with UNCHANGED content — plan2.releaseId === plan1.releaseId (pure content hash).
    const plan2 = await createReleasePlan(sourceDir, manifest1);
    assert.equal(plan2.releaseId, plan1.releaseId);
    const staged2 = await stageRelease(plan2, releaseRoot, "full");
    const manifest2 = await publishRelease(plan2, staged2.stagingDir, releaseRoot);

    // The manifest actually on disk must still be the ORIGINAL, not corrupted with a self-referential previousReleaseId.
    assert.equal(manifest2.previousReleaseId, undefined);
    const onDisk = await readReleaseManifest(releaseRoot, plan1.releaseId);
    assert.equal(onDisk?.previousReleaseId, undefined);
  });
});

test("publishRelease: a genuinely new release records the correct previousReleaseId", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan1 = await createReleasePlan(sourceDir, undefined);
    const staged1 = await stageRelease(plan1, releaseRoot, "full");
    const manifest1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);

    await buildFixture(sourceDir, ["about", "contact"]);
    const plan2 = await createReleasePlan(sourceDir, manifest1);
    assert.notEqual(plan2.releaseId, plan1.releaseId);
    const staged2 = await stageRelease(plan2, releaseRoot, "full");
    const manifest2 = await publishRelease(plan2, staged2.stagingDir, releaseRoot);

    assert.equal(manifest2.previousReleaseId, manifest1.releaseId);
  });
});

test("publishRelease: an idempotent republish still updates current.json even if it wasn't already current", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan1 = await createReleasePlan(sourceDir, undefined);
    const staged1 = await stageRelease(plan1, releaseRoot, "full");
    const manifest1 = await publishRelease(plan1, staged1.stagingDir, releaseRoot);

    await buildFixture(sourceDir, ["about", "contact"]);
    const plan2 = await createReleasePlan(sourceDir, manifest1);
    const staged2 = await stageRelease(plan2, releaseRoot, "full");
    await publishRelease(plan2, staged2.stagingDir, releaseRoot);

    // current.json now points at release 2 — republish release 1's original plan/staging.
    const staged1Again = await stageRelease(plan1, releaseRoot, "full");
    await publishRelease(plan1, staged1Again.stagingDir, releaseRoot);
    const pointer = await readCurrentPointer(releaseRoot);
    assert.equal(pointer?.releaseId, plan1.releaseId);
  });
});

test("repointCurrent: writes a pointer without requiring a staged release", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    await repointCurrent(releaseRoot, "rel-arbitrary");
    const pointer = await readCurrentPointer(releaseRoot);
    assert.equal(pointer?.releaseId, "rel-arbitrary");
  });
});

test("readReleaseManifest: returns undefined for an id that was never published", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    assert.equal(await readReleaseManifest(releaseRoot, "rel-never-existed"), undefined);
  });
});

test("releaseManifestPath: nests under releases/<id>/", async () => {
  const path = releaseManifestPath("dist/release", "rel-abc123");
  assert.ok(path.includes(join("releases", "rel-abc123")));
});

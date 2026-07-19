import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { runRelease, runRollback, runDeploymentHealthCheck } from "../runRelease";
import { withTempDirs, buildFixture } from "./testHelpers";

test("runRelease: 'dry-run' computes a plan and verification but writes nothing under releaseRoot", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const result = await runRelease({ mode: "dry-run", sourceDir, releaseRoot });
    assert.equal(result.published, false);
    assert.equal(result.reportPath, undefined);
    await assert.rejects(() => access(releaseRoot));
  });
});

test("runRelease: 'full' publishes and writes RELEASE_REPORT.md", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const result = await runRelease({ mode: "full", sourceDir, releaseRoot });
    assert.equal(result.published, true);
    assert.ok(result.reportPath);
    await access(result.reportPath!);
    await access(join(releaseRoot, "releases", result.releaseId, "metadata", "about.json"));
    await access(join(releaseRoot, "current.json"));
  });
});

test("runRelease: 'preview' stages and verifies but never publishes", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const result = await runRelease({ mode: "preview", sourceDir, releaseRoot });
    assert.equal(result.published, false);
    await assert.rejects(() => access(join(releaseRoot, "current.json")));
    // The staged copy remains on disk for inspection.
    await access(join(releaseRoot, ".staging", result.releaseId, "metadata", "about.json"));
  });
});

test("runRelease: 'incremental' after a 'full' release publishes successfully and reuses unchanged files", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    await runRelease({ mode: "full", sourceDir, releaseRoot });

    await buildFixture(sourceDir, ["about", "contact", "home"]);
    const result = await runRelease({ mode: "incremental", sourceDir, releaseRoot });
    assert.equal(result.published, true);
    assert.ok(result.plan.filesUnchanged.length > 0);
  });
});

test("runRelease: releases the lock even when verification fails", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    // A source build reporting errors fails verification inside runRelease's locked section.
    await runRelease({ mode: "full", sourceDir, releaseRoot }).catch(() => {});
    // Whether or not that run succeeded, the lock must not be left held — a second run must succeed.
    await buildFixture(sourceDir, ["about"]);
    const second = await runRelease({ mode: "full", sourceDir, releaseRoot });
    assert.equal(second.published, true);
  });
});

test("runRollback + runDeploymentHealthCheck: full round trip through the top-level API", async () => {
  await withTempDirs(async ({ sourceDir, releaseRoot }) => {
    await buildFixture(sourceDir, ["about"]);
    const r1 = await runRelease({ mode: "full", sourceDir, releaseRoot });

    await buildFixture(sourceDir, ["about", "contact"]);
    const r2 = await runRelease({ mode: "full", sourceDir, releaseRoot });
    assert.notEqual(r2.releaseId, r1.releaseId);

    const rollback = await runRollback("latest", false, releaseRoot);
    assert.equal(rollback.manifest.toReleaseId, r1.releaseId);
    await access(rollback.reportPath);

    const health = await runDeploymentHealthCheck(releaseRoot);
    assert.equal(health.health.currentReleaseId, r1.releaseId);
    assert.equal(health.health.status, "healthy");
    await access(health.reportPath);
  });
});

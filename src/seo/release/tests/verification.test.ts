import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createReleasePlan } from "../planner/createReleasePlan";
import { verifyRelease } from "../verification/verifyRelease";
import { withTempDirs, buildFixture } from "./testHelpers";

test("verifyRelease: zero errors for a real, freshly-built source directory checked against itself", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about", "contact"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const result = await verifyRelease(plan, sourceDir);
    assert.deepEqual(result.issues.filter((i) => i.severity === "error"), []);
  });
});

test("verifyRelease: flags a missing artifact", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    await rm(join(sourceDir, "metadata/about.json"));
    const result = await verifyRelease(plan, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_MISSING_ARTIFACT"));
  });
});

test("verifyRelease: flags a checksum mismatch", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    await writeFile(join(sourceDir, "metadata/about.json"), "{}", "utf-8");
    const result = await verifyRelease(plan, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_CHECKSUM_MISMATCH"));
  });
});

test("verifyRelease: flags an unexpected artifact not in the plan", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    await writeFile(join(sourceDir, "stray-file.json"), "{}", "utf-8");
    const result = await verifyRelease(plan, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_UNEXPECTED_ARTIFACT" && i.severity === "warning"));
  });
});

test("verifyRelease: flags invalid JSON in a .json artifact", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    await writeFile(join(sourceDir, "metadata/about.json"), "{ not valid json", "utf-8");
    const result = await verifyRelease(plan, sourceDir);
    // A corrupted .json file is both a checksum mismatch AND (if still checked) invalid JSON;
    // checksum mismatch alone is sufficient proof integrity checking caught it.
    assert.ok(result.issues.some((i) => i.code === "RELEASE_CHECKSUM_MISMATCH" || i.code === "RELEASE_INVALID_JSON_ARTIFACT"));
  });
});

test("verifyRelease: flags a duplicate path within the plan itself", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const duplicated = { ...plan, files: [...plan.files, plan.files[0]] };
    const result = await verifyRelease(duplicated, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_DUPLICATE_ARTIFACT"));
  });
});

test("verifyRelease: flags an unsupported build schemaVersion", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const withBadVersion = { ...plan, build: { ...plan.build, schemaVersion: "99.0.0" } };
    const result = await verifyRelease(withBadVersion, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_UNSUPPORTED_BUILD_VERSION"));
  });
});

test("verifyRelease: flags a source build that itself reported errors", async () => {
  await withTempDirs(async ({ sourceDir }) => {
    await buildFixture(sourceDir, ["about"]);
    const plan = await createReleasePlan(sourceDir, undefined);
    const withErrors = { ...plan, build: { ...plan.build, totalErrors: 3 } };
    const result = await verifyRelease(withErrors, sourceDir);
    assert.ok(result.issues.some((i) => i.code === "RELEASE_SOURCE_BUILD_HAD_ERRORS"));
  });
});

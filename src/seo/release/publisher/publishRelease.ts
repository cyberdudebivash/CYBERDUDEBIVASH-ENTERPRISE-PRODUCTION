import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { releaseDir, releaseManifestPath, currentPointerPath } from "./layout";
import type { ReleaseManifest, ReleasePlan, CurrentReleasePointer } from "../planner/types";

// publishRelease — the ONLY function in this platform that promotes a
// NEW release. Performs exactly three mechanical steps: rename the
// staged directory into place, write its RELEASE_MANIFEST.json, and
// atomically repoint current.json (via repointCurrent(), also reused
// as-is by rollback/ — repointing current.json to an ALREADY-published
// release is the same mechanical operation, not a second
// implementation of it). "No generation. No validation. No business
// logic." — this function does not call verifyRelease() itself (the
// caller's job, before ever calling this), does not decide whether a
// release SHOULD be published, and does not inspect file contents.

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Atomic on POSIX: write to a sibling temp file, then rename over the real path — current.json is never observable in a partially-written state. */
async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf-8");
  await rename(tempPath, path);
}

/** Repoints current.json at `releaseId` — used both by publishRelease() (a brand-new release) and by rollback/rollbackRelease.ts (an already-published, already-verified older release). Does not check that `releaseId` actually exists on disk; callers verify first. */
export async function repointCurrent(releaseRoot: string, releaseId: string): Promise<CurrentReleasePointer> {
  const pointer: CurrentReleasePointer = { releaseId, publishedAt: new Date().toISOString() };
  await writeJsonAtomic(currentPointerPath(releaseRoot), pointer);
  return pointer;
}

export async function publishRelease(plan: ReleasePlan, stagingDir: string, releaseRoot: string): Promise<ReleaseManifest> {
  const targetDir = releaseDir(releaseRoot, plan.releaseId);
  const manifestPath = releaseManifestPath(releaseRoot, plan.releaseId);

  if (await pathExists(targetDir)) {
    // Idempotent republish: identical content (same releaseId, a pure
    // content hash — see computeReleaseId.ts) was already promoted by
    // an earlier release. The staged copy is redundant, so it's
    // discarded — but critically, RELEASE_MANIFEST.json is NEVER
    // rewritten here: every release directory, once published, is
    // immutable, including its own recorded `previousReleaseId`.
    // Overwriting it with THIS republish's previousReleaseId (e.g.
    // itself, if nothing changed between two consecutive publishes)
    // would corrupt rollback's release-history chain — a real bug
    // this exact scenario caught during this phase's own smoke
    // testing (see documentation/RELEASE_PLATFORM.md's Known Risks).
    await rm(stagingDir, { recursive: true, force: true });
    const existing = JSON.parse(await readFile(manifestPath, "utf-8")) as ReleaseManifest;
    await repointCurrent(releaseRoot, plan.releaseId);
    return existing;
  }

  await mkdir(dirname(targetDir), { recursive: true });
  await rename(stagingDir, targetDir);

  const manifest: ReleaseManifest = {
    releaseId: plan.releaseId,
    createdAt: plan.createdAt,
    publishedAt: new Date().toISOString(),
    sourceDir: plan.sourceDir,
    previousReleaseId: plan.previousReleaseId,
    build: plan.build,
    files: plan.files,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  await repointCurrent(releaseRoot, plan.releaseId);

  return manifest;
}

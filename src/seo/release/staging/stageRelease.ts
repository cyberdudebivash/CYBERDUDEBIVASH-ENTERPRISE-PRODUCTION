import { copyFile, link, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stagingDir as stagingDirFor, releaseDir } from "../publisher/layout";
import type { ReleaseFileEntry, ReleasePlan } from "../planner/types";
import type { StagingMode, StagingResult } from "./types";

// stageRelease — copies a ReleasePlan's files into an isolated staging
// directory (`.staging/<releaseId>/`), never touching the currently
// published release or `current.json`. "Never publish directly": this
// module's output is only ever promoted by publisher/publishRelease.ts,
// a separate, later step.
//
// "incremental" mode hard-links `filesUnchanged` from the previous
// release's own directory (when one exists and linking succeeds)
// instead of copying them again — genuine disk-write savings for the
// common case where most artifacts didn't change between releases.
// Any file that can't be hard-linked (no previous release, or a
// cross-device link failure) falls back to a full copy from
// `sourceDir`, so staging always ends up complete regardless.

async function copyOne(sourceDir: string, destDir: string, file: ReleaseFileEntry): Promise<void> {
  const dest = join(destDir, file.path);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(join(sourceDir, file.path), dest);
}

async function linkOrCopy(sourceDir: string, destDir: string, previousReleaseDir: string | undefined, file: ReleaseFileEntry): Promise<"linked" | "copied"> {
  const dest = join(destDir, file.path);
  await mkdir(dirname(dest), { recursive: true });
  if (previousReleaseDir) {
    try {
      await link(join(previousReleaseDir, file.path), dest);
      return "linked";
    } catch {
      // Falls through to a full copy — no previous file at this path, or a cross-device link failure.
    }
  }
  await copyFile(join(sourceDir, file.path), dest);
  return "copied";
}

export async function stageRelease(plan: ReleasePlan, releaseRoot: string, mode: StagingMode): Promise<StagingResult> {
  const targetDir = stagingDirFor(releaseRoot, plan.releaseId);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const copiedPaths: string[] = [];
  const linkedPaths: string[] = [];

  if (mode === "full") {
    for (const file of plan.files) {
      await copyOne(plan.sourceDir, targetDir, file);
      copiedPaths.push(file.path);
    }
    return { stagingDir: targetDir, copiedPaths, linkedPaths };
  }

  const previousReleaseDir = plan.previousReleaseId ? releaseDir(releaseRoot, plan.previousReleaseId) : undefined;
  for (const file of [...plan.filesAdded, ...plan.filesUpdated]) {
    await copyOne(plan.sourceDir, targetDir, file);
    copiedPaths.push(file.path);
  }
  for (const file of plan.filesUnchanged) {
    const outcome = await linkOrCopy(plan.sourceDir, targetDir, previousReleaseDir, file);
    (outcome === "linked" ? linkedPaths : copiedPaths).push(file.path);
  }

  return { stagingDir: targetDir, copiedPaths, linkedPaths };
}

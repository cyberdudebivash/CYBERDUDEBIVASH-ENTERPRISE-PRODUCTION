import { scanDirectory } from "./scanDirectory";
import { readBuildManifest, toSourceBuildInfo } from "./readBuildManifest";
import { computeReleaseId } from "./computeReleaseId";
import type { ReleaseFileEntry, ReleaseManifest, ReleasePlan } from "./types";

// createReleasePlan — the Release Planner's single entry point.
// Performs reads only (scanDirectory, readBuildManifest, and the
// `previousManifest` the caller already read via
// publisher/readReleaseState.ts) — no filesystem mutation anywhere in
// this module, per this phase's own "No filesystem mutation" instruction.

function diff(files: readonly ReleaseFileEntry[], previous: ReleaseManifest | undefined) {
  const previousByPath = new Map((previous?.files ?? []).map((f) => [f.path, f.checksum]));
  const currentPaths = new Set(files.map((f) => f.path));

  const filesAdded: ReleaseFileEntry[] = [];
  const filesUpdated: ReleaseFileEntry[] = [];
  const filesUnchanged: ReleaseFileEntry[] = [];

  for (const file of files) {
    const previousChecksum = previousByPath.get(file.path);
    if (previousChecksum === undefined) filesAdded.push(file);
    else if (previousChecksum !== file.checksum) filesUpdated.push(file);
    else filesUnchanged.push(file);
  }

  const filesRemoved = [...previousByPath.keys()].filter((path) => !currentPaths.has(path));

  return { filesAdded, filesUpdated, filesUnchanged, filesRemoved };
}

export async function createReleasePlan(sourceDir: string, previousManifest: ReleaseManifest | undefined): Promise<ReleasePlan> {
  const files = await scanDirectory(sourceDir);
  const buildManifest = await readBuildManifest(sourceDir);
  const { filesAdded, filesUpdated, filesUnchanged, filesRemoved } = diff(files, previousManifest);

  return {
    releaseId: computeReleaseId(files),
    createdAt: new Date().toISOString(),
    sourceDir,
    previousReleaseId: previousManifest?.releaseId,
    build: toSourceBuildInfo(buildManifest),
    filesAdded,
    filesUpdated,
    filesRemoved,
    filesUnchanged,
    files,
  };
}

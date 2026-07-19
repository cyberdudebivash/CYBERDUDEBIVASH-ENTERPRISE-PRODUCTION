import { readFile } from "node:fs/promises";
import { currentPointerPath, releaseManifestPath } from "./layout";
import type { CurrentReleasePointer, ReleaseManifest } from "../planner/types";

// readReleaseState — read-only helpers for inspecting already-published
// release state (the current pointer, and any release's own manifest).
// Distinct from publishRelease() (the only function in this directory
// that writes) — every module that needs to know "what's currently
// live" (planner/, verification/, rollback/, health/) reads through
// these, never by hand-parsing JSON at a hard-coded path itself.

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function readCurrentPointer(releaseRoot: string): Promise<CurrentReleasePointer | undefined> {
  return readJson<CurrentReleasePointer>(currentPointerPath(releaseRoot));
}

export async function readReleaseManifest(releaseRoot: string, releaseId: string): Promise<ReleaseManifest | undefined> {
  return readJson<ReleaseManifest>(releaseManifestPath(releaseRoot, releaseId));
}

/** The currently published release's own manifest, or `undefined` if nothing has ever been published. */
export async function readCurrentReleaseManifest(releaseRoot: string): Promise<ReleaseManifest | undefined> {
  const pointer = await readCurrentPointer(releaseRoot);
  if (!pointer) return undefined;
  return readReleaseManifest(releaseRoot, pointer.releaseId);
}

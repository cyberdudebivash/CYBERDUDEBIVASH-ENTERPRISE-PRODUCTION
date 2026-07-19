import { readFile } from "node:fs/promises";
import type { BuildManifest } from "./types";

// readManifest — the read-side complement to ManifestWriter
// (writers/manifestWriter.ts): loads a previous build-manifest.json so
// generator/incrementalBuild.ts can compare checksums against it.
// Returns `undefined` (never throws) when no previous manifest exists
// — the expected, ordinary state for a project's first build, not an
// error condition.

export async function readManifest(path: string): Promise<BuildManifest | undefined> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as BuildManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuildManifest } from "../../build";
import type { SourceBuildInfo } from "./types";

// readBuildManifest — reads and parses the build-manifest.json Build
// Platform already wrote to `sourceDir`. This is the Release
// Platform's ONLY coupling to Build Platform: a type-only import of
// `BuildManifest` (for parsing safety, not a runtime dependency) and a
// plain `readFile` + `JSON.parse` of the file it produced. No function
// from src/seo/build is ever called — "consume ONLY Build Platform
// outputs" means the FILES it wrote, not its code. See
// documentation/RELEASE_PLATFORM.md's Architecture Decisions.

const BUILD_MANIFEST_RELATIVE_PATH = "manifests/build-manifest.json";

export function buildManifestPath(sourceDir: string): string {
  return join(sourceDir, BUILD_MANIFEST_RELATIVE_PATH);
}

export async function readBuildManifest(sourceDir: string): Promise<BuildManifest> {
  const raw = await readFile(buildManifestPath(sourceDir), "utf-8");
  return JSON.parse(raw) as BuildManifest;
}

export function toSourceBuildInfo(manifest: BuildManifest): SourceBuildInfo {
  return {
    schemaVersion: manifest.schemaVersion,
    mode: manifest.mode,
    generatedAt: manifest.generatedAt,
    totalErrors: manifest.summary.totalErrors,
    totalWarnings: manifest.summary.totalWarnings,
    invalidPages: manifest.summary.invalidPages,
  };
}

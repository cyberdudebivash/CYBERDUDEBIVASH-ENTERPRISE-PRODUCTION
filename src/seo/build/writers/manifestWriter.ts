import { writeTextFile } from "./fsWriter";
import type { BuildManifest } from "../manifests/types";

// ManifestWriter — serialization only.

export async function writeBuildManifest(outDir: string, manifest: BuildManifest): Promise<string> {
  return writeTextFile(outDir, "manifests/build-manifest.json", JSON.stringify(manifest, null, 2));
}

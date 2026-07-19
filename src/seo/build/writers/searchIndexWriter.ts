import { writeTextFile } from "./fsWriter";
import type { SearchIndexArtifact } from "../artifacts/types";

// SearchIndexWriter — serialization only.

export async function writeSearchIndexArtifact(outDir: string, artifact: SearchIndexArtifact): Promise<string> {
  return writeTextFile(outDir, "search-index.json", JSON.stringify(artifact, null, 2));
}

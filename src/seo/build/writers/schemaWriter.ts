import { writeTextFile } from "./fsWriter";
import type { JsonLdArtifact } from "../artifacts/types";

// SchemaWriter — serialization only. Writes one page's JSON-LD graph
// exactly as the Runtime composed it (artifact.json is already valid,
// minified JSON — see artifacts/pageArtifacts.ts); this writer does
// not reformat or reinterpret it.

export async function writeJsonLdArtifact(outDir: string, artifact: JsonLdArtifact): Promise<string> {
  return writeTextFile(outDir, `schema/${artifact.pageId}.json`, artifact.json);
}

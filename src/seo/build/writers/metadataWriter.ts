import { writeTextFile } from "./fsWriter";
import type { PageMetadataArtifact } from "../artifacts/types";

// MetadataWriter — serialization only. Writes one page's consolidated
// metadata artifact (title, description, canonical, alternates, Open
// Graph, Twitter Card, breadcrumb) as pretty-printed JSON.

export async function writeMetadataArtifact(outDir: string, artifact: PageMetadataArtifact): Promise<string> {
  return writeTextFile(outDir, `metadata/${artifact.pageId}.json`, JSON.stringify(artifact, null, 2));
}

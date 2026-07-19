import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// fsWriter — the one place every writer touches the filesystem.
// Every other writer in this directory calls writeTextFile(); none of
// them import "node:fs" themselves. Serialization only: this function
// does not decide what content is, only that it gets written to
// `outDir/relativePath`, creating parent directories as needed.

export async function writeTextFile(outDir: string, relativePath: string, content: string): Promise<string> {
  const fullPath = join(outDir, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
  return relativePath;
}

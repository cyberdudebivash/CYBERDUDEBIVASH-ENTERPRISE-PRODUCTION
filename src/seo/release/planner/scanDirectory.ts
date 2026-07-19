import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ReleaseFileEntry } from "./types";

// scanDirectory — a pure, read-only filesystem scan: every file under
// `root`, with its sha256 checksum, as a flat list of paths relative
// to `root`. No filesystem mutation — the planner's own guarantee
// ("no filesystem mutation") starts here, at its one real I/O
// primitive. Every artifact Build Platform wrote is scanned, including
// its own build-manifest.json and BUILD_REPORT.md — this platform
// tracks and republishes everything Build Platform produced, not a
// hand-picked subset.

function checksumFile(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

async function walk(root: string, dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(root, fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

export async function scanDirectory(root: string): Promise<ReleaseFileEntry[]> {
  const absolutePaths = await walk(root, root);
  const entries: ReleaseFileEntry[] = [];
  for (const absolutePath of absolutePaths) {
    const content = await readFile(absolutePath);
    entries.push({ path: relative(root, absolutePath).split("\\").join("/"), checksum: checksumFile(content) });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

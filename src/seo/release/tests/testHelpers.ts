import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { runBuild } from "../../build";

// testHelpers — not a `.test.ts` file itself. `runBuild()` here
// simulates "Build Platform already ran," setting up realistic
// `dist/seo`-shaped fixtures for Release Platform's own tests to
// consume; it is test scaffolding, not Release Platform's own runtime
// code calling Build Platform (which the platform itself never does).

export async function withTempDirs<T>(fn: (dirs: { sourceDir: string; releaseRoot: string }) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "seo-release-"));
  try {
    return await fn({ sourceDir: join(root, "dist-seo"), releaseRoot: join(root, "dist-release") });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function buildFixture(sourceDir: string, pageIds?: readonly string[]): Promise<void> {
  await runBuild({ mode: "full-site", outDir: sourceDir, pageIds });
}

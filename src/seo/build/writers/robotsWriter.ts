import { writeTextFile } from "./fsWriter";
import type { RobotsArtifact } from "../artifacts/types";

// RobotsWriter — serialization only: renders a RobotsArtifact into
// robots.txt text. Deliberately minimal (global allow-all plus
// per-page Disallow plus a Sitemap: reference) — see artifacts/types.ts's
// RobotsArtifact for why this does not attempt to reproduce the real,
// hand-authored public/robots.txt's per-bot rules.

export function renderRobotsTxt(artifact: RobotsArtifact): string {
  const lines = ["User-agent: *", "Allow: /"];
  for (const path of artifact.disallowedPaths) lines.push(`Disallow: ${path}`);
  if (artifact.sitemapUrl) {
    lines.push("");
    lines.push(`Sitemap: ${artifact.sitemapUrl}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function writeRobotsArtifact(outDir: string, artifact: RobotsArtifact): Promise<string> {
  return writeTextFile(outDir, "robots.txt", renderRobotsTxt(artifact));
}

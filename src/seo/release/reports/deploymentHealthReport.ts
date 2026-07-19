import { mkdir, writeFile } from "node:fs/promises";
import { reportsDir } from "../publisher/layout";
import type { ReleaseHealthReport } from "../health/types";

// deploymentHealthReport — computes (trivially) and writes
// DEPLOYMENT_HEALTH.md from a ReleaseHealthReport.

export function renderDeploymentHealthMarkdown(health: ReleaseHealthReport): string {
  const lines = [
    "# Deployment Health",
    "",
    `- **Status:** ${health.status}`,
    `- **Current release:** ${health.currentReleaseId ? `\`${health.currentReleaseId}\`` : "none"}`,
    `- **Lock held:** ${health.lockHeld ? "yes" : "no"}`,
    `- **Generated at:** ${new Date().toISOString()}`,
  ];
  if (health.reasons.length > 0) {
    lines.push("", "## Reasons", "", ...health.reasons.map((reason) => `- ${reason}`));
  }
  return `${lines.join("\n")}\n`;
}

export async function writeDeploymentHealthReport(releaseRoot: string, health: ReleaseHealthReport): Promise<string> {
  const dir = reportsDir(releaseRoot);
  await mkdir(dir, { recursive: true });
  const path = `${dir}/DEPLOYMENT_HEALTH.md`;
  await writeFile(path, renderDeploymentHealthMarkdown(health), "utf-8");
  return path;
}

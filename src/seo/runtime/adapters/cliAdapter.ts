import type { SEORuntimeResult } from "../contracts/types";

// CLIAdapter — transforms a SEORuntimeResult into a human-readable
// plain-text summary, for a future `npx tsx` diagnostic script or CLI
// command to print. Reports only what the pipeline already computed
// (diagnostics counts, commercial presence) — no new analysis.

export function renderCLISummary(result: SEORuntimeResult): string {
  const { pageId, metadata, schemas, relationships, commercial, diagnostics } = result;

  const lines = [
    `SEO Runtime Result — "${pageId}"`,
    `  title:          ${metadata.title}`,
    `  canonical:      ${metadata.canonical}`,
    `  schema nodes:   ${schemas["@graph"].length} (${diagnostics.schema.nodeTypes.join(", ")})`,
    `  relationships:  ${relationships.length}`,
    `  commercial:     ${commercial ? `${commercial.commercialPriority ?? "unset priority"} / ${commercial.funnelStage ?? "unset funnel stage"}` : "not a pilot entity"}`,
    `  execution time: ${diagnostics.executionTimeMs.toFixed(2)}ms`,
    `  warnings:       ${diagnostics.warnings.length}`,
  ];

  for (const warning of diagnostics.warnings) {
    lines.push(`    - ${warning}`);
  }

  return lines.join("\n");
}

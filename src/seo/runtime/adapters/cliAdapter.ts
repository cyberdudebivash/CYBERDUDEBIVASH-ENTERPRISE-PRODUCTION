import type { SEORuntimeResult } from "../contracts/types";

// cliAdapter — transformation only: reshapes an SEORuntimeResult into
// a short, human-readable text report suitable for terminal output
// (a future `seo-runtime inspect <pageId>` command). Decides nothing
// about pass/fail; a caller that wants an exit code inspects
// result.diagnostics or health/'s RuntimeHealthReport directly.

function statusLine(diagnostics: SEORuntimeResult["diagnostics"]): string {
  const { errors, warnings } = diagnostics;
  if (errors.length > 0) return `FAILED (${errors.length} error(s), ${warnings.length} warning(s))`;
  if (warnings.length > 0) return `OK (${warnings.length} warning(s))`;
  return "OK";
}

export function renderCLIReport(result: SEORuntimeResult): string {
  const { metadata, schemas, relationships, commercial, diagnostics } = result;
  const lines = [
    `SEO Runtime — "${diagnostics.pageId}"`,
    `  status:        ${statusLine(diagnostics)}`,
    `  title:         ${metadata.title}`,
    `  canonical:     ${metadata.canonical}`,
    `  schema nodes:  ${schemas["@graph"].length}`,
    `  relationships: ${relationships.length}`,
    `  commercial:    ${commercial ? `present (readiness ${diagnostics.commercialSummary.readinessScore ?? "n/a"})` : "not applicable"}`,
    `  duration:      ${diagnostics.executionTimeMs.toFixed(2)}ms`,
  ];
  if (diagnostics.errors.length > 0) {
    lines.push("  errors:");
    for (const error of diagnostics.errors) lines.push(`    - [${error.code}] ${error.message}`);
  }
  if (diagnostics.warnings.length > 0) {
    lines.push("  warnings:");
    for (const warning of diagnostics.warnings) lines.push(`    - [${warning.code}] ${warning.message}`);
  }
  return lines.join("\n");
}

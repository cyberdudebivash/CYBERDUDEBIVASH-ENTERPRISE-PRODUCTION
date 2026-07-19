import { generateValidationReport } from "../../reports";
import type { SEOValidationReport } from "../../reports";
import { ValidationError } from "../contracts/errors";

// configurationIntegration — the pipeline's "Configuration ->
// Validation" stage, run once per pipeline invocation (config-wide,
// not per page) and gating every page's run: "No subsystem may skip
// validation. Begin with full validation." A config-wide error means
// the shared data model itself is unsound, so it blocks every page,
// not just the one being requested.

export function buildValidatedConfigurationReport(): SEOValidationReport {
  const report = generateValidationReport();
  if (report.summary.errorCount > 0) {
    const failing = report.results.flatMap((r) => r.issues.filter((i) => i.severity === "error"));
    throw new ValidationError(
      `buildValidatedConfigurationReport: ${report.summary.errorCount} configuration error(s) — ${failing.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
    );
  }
  return report;
}

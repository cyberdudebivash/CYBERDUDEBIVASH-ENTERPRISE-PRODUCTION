import { generateValidationReport } from "../../../reports/generateReport";
import type { SEOValidationReport } from "../../../reports/types";
import { ValidationError } from "../../contracts/errors";

// ValidationStage — runs Phase 1.0.5's whole-platform validation engine
// (all 16 domain validators) once per pipeline execution and enforces
// this program's one non-negotiable invariant: no page's Runtime Result
// may ever be produced while the underlying configuration has an
// error-severity issue anywhere. Pure and side-effect-free (see
// generateReport.ts's own header comment), so calling it once per
// generateSEO() invocation costs correctness nothing — the cache layer
// (cache/) is what keeps this from re-running unnecessarily across
// repeated calls for the same page.

export function runPlatformValidation(): SEOValidationReport {
  const report = generateValidationReport();
  if (report.summary.errorCount > 0) {
    const errors = report.results.flatMap((r) => r.issues.filter((i) => i.severity === "error"));
    throw new ValidationError(
      `generateSEO: ${report.summary.errorCount} platform validation error(s) found — the Runtime refuses to generate output while the underlying configuration is invalid`,
      errors,
    );
  }
  return report;
}

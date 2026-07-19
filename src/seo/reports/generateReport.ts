import {
  validatePages,
  validateProducts,
  validateServices,
  validateSolutions,
  validateArticles,
  validateAuthors,
  validateNavigation,
  validateRelationships,
  validateKnowledgeGraph,
  validateCanonical,
  validateSchema,
  validateKeywords,
  validateCommercial,
  validateImages,
  validateCTA,
  validateConfiguration,
  type ValidationResult,
} from "../validators";
import type { SEOValidationReport, ValidationSummary } from "./types";

// The pure orchestrator: composes all 16 domain validators against the
// real Phase 1.0 config data and returns one aggregate report. This
// function does not write anything to disk — "no filesystem mutation" is
// a property of the validation engine's own code, matching every other
// validator in this directory. SEO_VALIDATION_REPORT.md is produced by
// running this once (via a throwaway script, not committed) and
// transcribing its real output — the same way a test assertion reads
// actual output rather than a generator writing files as a side effect.

const VALIDATORS: Array<() => ValidationResult> = [
  validatePages,
  validateProducts,
  validateServices,
  validateSolutions,
  validateArticles,
  validateAuthors,
  validateNavigation,
  validateRelationships,
  validateKnowledgeGraph,
  validateCanonical,
  validateSchema,
  validateKeywords,
  validateCommercial,
  validateImages,
  validateCTA,
  validateConfiguration,
];

function summarize(results: readonly ValidationResult[]): ValidationSummary {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  for (const result of results) {
    for (const item of result.issues) {
      if (item.severity === "error") errorCount++;
      else if (item.severity === "warning") warningCount++;
      else infoCount++;
    }
  }
  return {
    totalValidators: results.length,
    totalIssues: errorCount + warningCount + infoCount,
    errorCount,
    warningCount,
    infoCount,
  };
}

export function generateValidationReport(): SEOValidationReport {
  const results = VALIDATORS.map((validator) => validator());
  return {
    generatedAt: new Date().toISOString(),
    summary: summarize(results),
    results,
  };
}

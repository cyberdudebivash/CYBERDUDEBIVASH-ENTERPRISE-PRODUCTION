import type { ValidationResult } from "../validators";

// Owns: the shape of the aggregate validation report — what
// generateReport.ts produces and what SEO_VALIDATION_REPORT.md is a
// human-readable transcription of. Nothing here writes a file; that
// remains a manual, deliberate step (see generateReport.ts's header
// comment) so this stays a pure, side-effect-free data shape.

export interface ValidationSummary {
  totalValidators: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface SEOValidationReport {
  generatedAt: string;
  summary: ValidationSummary;
  results: ValidationResult[];
}

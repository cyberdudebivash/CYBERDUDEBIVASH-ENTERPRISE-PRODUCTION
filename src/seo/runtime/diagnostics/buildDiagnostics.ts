import { validatePageSchemaSet } from "../../schema";
import type { PageMetadata } from "../../metadata";
import type { PageSchemaSet } from "../../schema";
import { validateRecommendations } from "../../relationships";
import type { RelationshipGraph, RelationshipRecommendation } from "../../relationships";
import { buildRelationshipEnrichment, computeReadinessScore, validateCommercialView } from "../../commercial";
import type { CommercialEntityView } from "../../commercial";
import type { SEOValidationReport } from "../../reports";
import type { ValidationIssue } from "../../validators/shared";
import type { RuntimeDiagnostics } from "../contracts/types";

// buildDiagnostics — the DIAGNOSTICS section's required summary,
// assembled by re-running each engine's own (pure, cheap) validator
// against data the pipeline already produced. This is deliberately
// separate from integration/*.ts's own validation gates: those decide
// whether the pipeline may proceed at all (error-severity only, throw
// on failure); this module OBSERVES the full issue set (including
// warnings) for reporting, never throws, and never re-derives the
// underlying data itself.

export interface BuildDiagnosticsInput {
  pageId: string;
  metadata: PageMetadata;
  schemas: PageSchemaSet;
  relationships: RelationshipRecommendation[];
  relationshipGraph: RelationshipGraph;
  commercial: CommercialEntityView | undefined;
  configurationReport: SEOValidationReport;
  executionTimeMs: number;
}

export function buildDiagnostics(input: BuildDiagnosticsInput): RuntimeDiagnostics {
  const { pageId, metadata, schemas, relationships, relationshipGraph, commercial, configurationReport, executionTimeMs } = input;

  const schemaIssues = validatePageSchemaSet(schemas).issues;
  const schemaErrors = schemaIssues.filter((i) => i.severity === "error");

  const relationshipIssues = validateRecommendations(relationships, relationshipGraph).issues;
  const relationshipErrors = relationshipIssues.filter((i) => i.severity === "error");
  const relationshipWarnings = relationshipIssues.filter((i) => i.severity === "warning");

  let commercialSummary: RuntimeDiagnostics["commercialSummary"] = { present: false, errorCount: 0, warningCount: 0 };
  let commercialIssues: ValidationIssue[] = [];
  if (commercial) {
    commercialIssues = validateCommercialView(commercial).issues;
    const errorCount = commercialIssues.filter((i) => i.severity === "error").length;
    const warningCount = commercialIssues.filter((i) => i.severity === "warning").length;
    const enrichment = buildRelationshipEnrichment(commercial.kind, commercial.id, relationshipGraph);
    const score = computeReadinessScore(commercial, enrichment, errorCount);
    commercialSummary = { present: true, readinessScore: score.overallScore, errorCount, warningCount };
  }

  const allErrors = [...schemaErrors, ...relationshipErrors, ...commercialIssues.filter((i) => i.severity === "error")];
  const allWarnings = [
    ...schemaIssues.filter((i) => i.severity === "warning"),
    ...relationshipWarnings,
    ...commercialIssues.filter((i) => i.severity === "warning"),
  ];

  return {
    pageId,
    generatedAt: new Date().toISOString(),
    executionTimeMs,
    coverage: {
      metadata: true,
      schema: schemas["@graph"].length > 0,
      relationships: relationships.length > 0,
      commercial: commercial !== undefined,
    },
    metadataSummary: {
      keywordCount: metadata.keywords.length,
      alternateCount: metadata.alternates.length,
    },
    schemaSummary: {
      nodeCount: schemas["@graph"].length,
      errorCount: schemaErrors.length,
    },
    relationshipSummary: {
      recommendationCount: relationships.length,
      errorCount: relationshipErrors.length,
      warningCount: relationshipWarnings.length,
    },
    commercialSummary,
    validationSummary: {
      errorCount: configurationReport.summary.errorCount,
      warningCount: configurationReport.summary.warningCount,
      infoCount: configurationReport.summary.infoCount,
    },
    errors: allErrors,
    warnings: allWarnings,
  };
}

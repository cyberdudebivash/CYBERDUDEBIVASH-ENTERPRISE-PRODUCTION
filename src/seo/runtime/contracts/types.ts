import type { PageMetadata } from "../../metadata";
import type { PageSchemaSet } from "../../schema";
import type { RelationshipRecommendation } from "../../relationships";
import type { CommercialEntityView } from "../../commercial";
import type { ValidationIssue } from "../../validators/shared";

// Owns: the Runtime Platform's own public shapes — the "single public
// API" contract (SEORuntimeResult) plus the Diagnostics and Health
// report shapes it composes. Every field here is built FROM the
// existing engines' own output types (PageMetadata, PageSchemaSet,
// RelationshipRecommendation, CommercialEntityView); nothing here
// redeclares or widens any of them.

export interface RuntimeCoverage {
  metadata: boolean;
  schema: boolean;
  relationships: boolean;
  commercial: boolean;
}

export interface RuntimeMetadataSummary {
  keywordCount: number;
  alternateCount: number;
}

export interface RuntimeSchemaSummary {
  nodeCount: number;
  errorCount: number;
}

export interface RuntimeRelationshipSummary {
  recommendationCount: number;
  errorCount: number;
  warningCount: number;
}

export interface RuntimeCommercialSummary {
  present: boolean;
  readinessScore?: number;
  errorCount: number;
  warningCount: number;
}

export interface RuntimeValidationSummary {
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * One page's full runtime diagnostics — the DIAGNOSTICS section's
 * required fields (validation status, warnings, errors, coverage,
 * relationship health, commercial readiness, schema completeness,
 * metadata completeness, runtime duration), all computed from data the
 * pipeline already produced for this page rather than re-derived.
 */
export interface RuntimeDiagnostics {
  pageId: string;
  generatedAt: string;
  executionTimeMs: number;
  coverage: RuntimeCoverage;
  metadataSummary: RuntimeMetadataSummary;
  schemaSummary: RuntimeSchemaSummary;
  relationshipSummary: RuntimeRelationshipSummary;
  commercialSummary: RuntimeCommercialSummary;
  validationSummary: RuntimeValidationSummary;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * The Runtime Platform's single public contract — generateSEO(pageId)'s
 * return shape, exactly as specified: metadata, schemas, relationships,
 * commercial, diagnostics. `commercial` is legitimately `undefined` for
 * any page with no Phase 1.4 commercial profile (today, every page
 * except "about" — see integration/commercialIntegration.ts).
 */
export interface SEORuntimeResult {
  metadata: PageMetadata;
  schemas: PageSchemaSet;
  relationships: RelationshipRecommendation[];
  commercial: CommercialEntityView | undefined;
  diagnostics: RuntimeDiagnostics;
}

export type RuntimeHealthStatus = "healthy" | "warning" | "error";

export interface RuntimeHealthIssues {
  missingEntities: string[];
  brokenReferences: string[];
  duplicateIds: string[];
  configurationIssues: string[];
  pipelineFailures: string[];
}

/**
 * A platform-wide fitness snapshot (see health/) — deliberately
 * separate from per-page RuntimeDiagnostics above, matching the HEALTH
 * section's own five-way breakdown (configuration, pipeline,
 * relationships, validation, commercial) plus one overall status.
 */
export interface RuntimeHealthReport {
  status: RuntimeHealthStatus;
  configuration: RuntimeHealthStatus;
  pipeline: RuntimeHealthStatus;
  relationships: RuntimeHealthStatus;
  validation: RuntimeHealthStatus;
  commercial: RuntimeHealthStatus;
  issues: RuntimeHealthIssues;
}

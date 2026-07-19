import type { PageMetadata } from "../../metadata/types";
import type { PageSchemaSet } from "../../schema/types/nodes";
import type { RelationshipRecommendation } from "../../relationships/graph/types";
import type { CommercialEntityView } from "../../commercial/config/types";
import type { CommercialPriority, FunnelStage } from "../../types/commercial";

// The Runtime Platform's own shapes (Phase 1.5). SEORuntimeResult is
// the ONLY shape a consumer of generateSEO(pageId) ever sees — it
// composes the five Phase 1.1-1.4 engine outputs plus this phase's own
// SEORuntimeDiagnostics, and nothing here re-declares a single field
// any of those engines already owns (metadata/schemas/relationships/
// commercial are the real, unmodified engine output types).

export interface SEOMetadataDiagnostics {
  titleLength: number;
  descriptionLength: number;
  keywordCount: number;
  alternateCount: number;
}

export interface SEOSchemaDiagnostics {
  nodeCount: number;
  nodeTypes: string[];
}

export interface SEORelationshipDiagnostics {
  total: number;
  byTargetKind: Record<string, number>;
  bySignal: Record<string, number>;
}

export interface SEOCommercialDiagnostics {
  present: boolean;
  commercialPriority?: CommercialPriority;
  funnelStage?: FunnelStage;
}

export interface SEOValidationDiagnostics {
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface SEOCoverageDiagnostics {
  metadataFieldsPresent: number;
  metadataFieldsTotal: number;
  commercialFieldsPresent: number;
  commercialFieldsTotal: number;
}

/**
 * Everything the Diagnostics stage observed while composing one page's
 * SEORuntimeResult. `warnings` collects every warning-severity
 * ValidationIssue message raised by any stage for this page (including
 * ones the underlying engines validate internally but never surface to
 * their own callers, e.g. MetadataEngine only ever throws on
 * error-severity issues and silently discards warnings — this is where
 * those become visible). `errors` is always empty on a successful
 * result (an error-severity issue anywhere aborts the pipeline via a
 * typed SEORuntimeError instead) — present for shape symmetry with
 * `warnings` and so RuntimeHealthCheck can reuse this same shape.
 */
export interface SEORuntimeDiagnostics {
  pageId: string;
  generatedAt: string;
  executionTimeMs: number;
  metadata: SEOMetadataDiagnostics;
  schema: SEOSchemaDiagnostics;
  relationships: SEORelationshipDiagnostics;
  commercial: SEOCommercialDiagnostics;
  validation: SEOValidationDiagnostics;
  coverage: SEOCoverageDiagnostics;
  warnings: string[];
  errors: string[];
}

/**
 * The Runtime Contract's single public output shape — see
 * documentation/PUBLIC_API.md. `commercial` is `undefined` for any page
 * outside the Phase 1.4 pilot (12 entities) — this is expected, valid
 * output, not a failure; see documentation/ENGINE_INTEGRATION.md.
 */
export interface SEORuntimeResult {
  pageId: string;
  metadata: PageMetadata;
  schemas: PageSchemaSet;
  relationships: RelationshipRecommendation[];
  commercial: CommercialEntityView | undefined;
  diagnostics: SEORuntimeDiagnostics;
}

/** Options accepted by generateSEO() — every field optional so the literal `generateSEO(pageId)` call the Runtime Contract specifies keeps working unchanged. */
export interface SEORuntimeOptions {
  /** Bypasses the cache for this call, both for reading and for writing the fresh result back. Defaults to false. */
  skipCache?: boolean;
}

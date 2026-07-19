import { isMissing, type ValidationIssue } from "../../validators/shared";
import type { PageMetadata } from "../../metadata/types";
import type { PageSchemaSet } from "../../schema/types/nodes";
import type { RelationshipRecommendation } from "../../relationships/graph/types";
import type { CommercialEntityView } from "../../commercial/config/types";
import type { SEORuntimeDiagnostics } from "../contracts/types";

export interface BuildDiagnosticsInput {
  pageId: string;
  startedAt: number;
  metadata: PageMetadata;
  schemas: PageSchemaSet;
  relationships: RelationshipRecommendation[];
  commercial: CommercialEntityView | undefined;
  /** Every warning-severity ValidationIssue collected across the Metadata, Schema, Relationships, and Commercial stages for THIS page — see documentation/RUNTIME_HEALTH.md for why this is deliberately page-scoped rather than the whole-platform validation totals (that is checkRuntimeHealth()'s responsibility, not Diagnostics'). */
  stageWarnings: ValidationIssue[];
}

const METADATA_COVERAGE_FIELDS: ReadonlyArray<(m: PageMetadata) => unknown> = [
  (m) => m.title,
  (m) => m.description,
  (m) => m.canonical,
  (m) => m.keywords,
  (m) => m.openGraph.image,
  (m) => m.twitter.image,
  (m) => m.publisher.name,
  (m) => m.author,
  (m) => m.application,
];

const COMMERCIAL_COVERAGE_FIELDS: ReadonlyArray<(c: CommercialEntityView) => unknown> = [
  (c) => c.businessObjective,
  (c) => c.conversionGoal,
  (c) => c.primaryCta,
  (c) => c.buyerPersona,
  (c) => c.valueProposition,
  (c) => c.customerPainPoints,
  (c) => c.customerOutcomes,
  (c) => c.trustSignals,
  (c) => c.keywords,
];

function countByKey<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// buildDiagnostics — the Diagnostics stage's one composition point,
// called last so `executionTimeMs` measures the whole pipeline
// (Configuration through Commercial), not just this stage's own work.
// Every count here is derived, never re-validated — Diagnostics reports
// what the earlier stages already established, it does not re-run
// engine logic.

export function buildDiagnostics(input: BuildDiagnosticsInput): SEORuntimeDiagnostics {
  const { pageId, startedAt, metadata, schemas, relationships, commercial, stageWarnings } = input;

  const nodeTypes = Array.from(new Set(schemas["@graph"].map((node) => node["@type"]))).sort();

  const commercialFieldsPresent = commercial ? COMMERCIAL_COVERAGE_FIELDS.filter((f) => !isMissing(f(commercial))).length : 0;

  return {
    pageId,
    generatedAt: new Date().toISOString(),
    executionTimeMs: performance.now() - startedAt,
    metadata: {
      titleLength: metadata.title.length,
      descriptionLength: metadata.description.length,
      keywordCount: metadata.keywords.length,
      alternateCount: metadata.alternates.length,
    },
    schema: {
      nodeCount: schemas["@graph"].length,
      nodeTypes,
    },
    relationships: {
      total: relationships.length,
      byTargetKind: countByKey(relationships, (r) => r.targetKind),
      bySignal: countByKey(relationships, (r) => r.signal),
    },
    commercial: {
      present: commercial !== undefined,
      commercialPriority: commercial?.commercialPriority,
      funnelStage: commercial?.funnelStage,
    },
    validation: {
      errorCount: 0,
      warningCount: stageWarnings.filter((i) => i.severity === "warning").length,
      infoCount: stageWarnings.filter((i) => i.severity === "info").length,
    },
    coverage: {
      metadataFieldsPresent: METADATA_COVERAGE_FIELDS.filter((f) => !isMissing(f(metadata))).length,
      metadataFieldsTotal: METADATA_COVERAGE_FIELDS.length,
      commercialFieldsPresent,
      commercialFieldsTotal: commercial ? COMMERCIAL_COVERAGE_FIELDS.length : 0,
    },
    warnings: stageWarnings.map((issue) => `[${issue.code}] ${issue.message}`),
    errors: [],
  };
}

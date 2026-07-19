import { resolvePage } from "./stages/configurationStage";
import { runPlatformValidation } from "./stages/validationStage";
import { runMetadataStage } from "./stages/metadataStage";
import { runSchemaStage } from "./stages/schemaStage";
import { runRelationshipsStage } from "./stages/relationshipsStage";
import { runCommercialStage } from "./stages/commercialStage";
import { buildDiagnostics } from "../diagnostics/buildDiagnostics";
import type { SEORuntimeResult } from "../contracts/types";

// runPipeline — the Runtime Contract's deterministic pipeline, composed
// exactly in the fixed order documentation/PIPELINE_ARCHITECTURE.md
// diagrams: Configuration -> Validation -> Metadata -> Schema ->
// Relationships -> Commercial -> Diagnostics -> Runtime Result. Unlike
// schema/registry/schemaRegistry.ts's DEFAULT_PRODUCERS (an
// intentionally extensible array of pure producers), this sequence is
// NOT extensible or reorderable by a caller — every stage after
// Configuration depends on state only an earlier stage produces, so it
// is written as one explicit sequence of calls rather than a generic
// array a future change might silently reorder. Every stage is a pure
// function of its inputs; the only side-effecting concern in the whole
// Runtime — caching — lives entirely in integration/generateSEO.ts, not
// here, so this function is safe to call directly (uncached) from
// tests, from checkRuntimeHealth(), or from a future caller that wants
// a guaranteed-fresh result.

export function runPipeline(pageId: string): SEORuntimeResult {
  const startedAt = performance.now();

  const page = resolvePage(pageId);
  runPlatformValidation();

  const { metadata, warnings: metadataWarnings } = runMetadataStage(page);
  const { schemas, warnings: schemaWarnings } = runSchemaStage(page);
  const { recommendations, warnings: relationshipWarnings } = runRelationshipsStage(page);
  const { commercial, warnings: commercialWarnings } = runCommercialStage(page);

  const diagnostics = buildDiagnostics({
    pageId: page.id,
    startedAt,
    metadata,
    schemas,
    relationships: recommendations,
    commercial,
    stageWarnings: [...metadataWarnings, ...schemaWarnings, ...relationshipWarnings, ...commercialWarnings],
  });

  return {
    pageId: page.id,
    metadata,
    schemas,
    relationships: recommendations,
    commercial,
    diagnostics,
  };
}

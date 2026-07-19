import { generatePageMetadata } from "../../../metadata/metadataEngine";
import { validateMetadata } from "../../../metadata/metadataValidator";
import type { PageMetadata } from "../../../metadata/types";
import type { SEOPage } from "../../../types/page";
import type { ValidationIssue } from "../../../validators/shared";
import { PipelineError } from "../../contracts/errors";

export interface MetadataStageResult {
  metadata: PageMetadata;
  warnings: ValidationIssue[];
}

// MetadataStage — composes Phase 1.1's Metadata Engine.
// generatePageMetadata() already throws on any error-severity issue
// (MetadataEngine's own guarantee — see metadataEngine.ts), so a throw
// here can only mean that; re-thrown as a typed PipelineError so every
// Runtime failure carries the same shape regardless of which engine
// produced it. MetadataValidator is run a second time, on the already-
// valid result, purely to surface warning-severity issues into
// diagnostics — MetadataEngine's own contract discards them, and this
// is the one place in the platform a caller can still see them.

export function runMetadataStage(page: SEOPage): MetadataStageResult {
  let metadata: PageMetadata;
  try {
    metadata = generatePageMetadata(page);
  } catch (error) {
    throw new PipelineError(`metadata stage failed for page "${page.id}": ${error instanceof Error ? error.message : String(error)}`, "metadata");
  }

  const warnings = validateMetadata(metadata).issues.filter((issue) => issue.severity === "warning");
  return { metadata, warnings };
}

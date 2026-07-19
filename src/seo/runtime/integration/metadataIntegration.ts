import type { SEOPage } from "../../types/page";
import { generatePageMetadata } from "../../metadata";
import type { PageMetadata } from "../../metadata";
import { PipelineError } from "../contracts/errors";

// metadataIntegration — a thin composition wrapper around Phase 1.1's
// generatePageMetadata(). generatePageMetadata already builds AND
// validates internally, throwing on any error-severity issue rather
// than returning a partially-valid object; this wrapper's only job is
// re-typing that failure as this platform's typed PipelineError
// instead of a bare Error, per "Typed errors only." No metadata logic
// is duplicated here.

export function integrateMetadata(page: SEOPage): PageMetadata {
  try {
    return generatePageMetadata(page);
  } catch (cause) {
    throw new PipelineError(`integrateMetadata("${page.id}"): ${(cause as Error).message}`);
  }
}

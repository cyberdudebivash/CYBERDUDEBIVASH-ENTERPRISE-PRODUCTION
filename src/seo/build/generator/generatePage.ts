import { generateSEO } from "../../runtime";
import type { SEORuntimeResult } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { validatePageArtifactSet } from "../validators/artifactValidator";
import type { PageArtifactSet } from "../artifacts/types";
import type { ValidationResult } from "../../validators/shared";

// generatePage — the Build Platform's single-page generation unit.
// `generate` defaults to the Runtime's stateless generateSEO(), but
// accepts any (pageId) => SEORuntimeResult function — in particular
// createSEORuntime().generateSEO, so a multi-page run (generateSite.ts)
// can reuse one cached relationship graph/configuration report across
// every page rather than rebuilding them per page. Either way, this
// module never calls anything but the Runtime API.

export interface PageGenerationResult {
  pageId: string;
  runtime: SEORuntimeResult;
  artifacts: PageArtifactSet;
  validation: ValidationResult;
}

export function generatePage(pageId: string, generate: (pageId: string) => SEORuntimeResult = generateSEO): PageGenerationResult {
  const runtime = generate(pageId);
  const artifacts = buildPageArtifactSet(pageId, runtime);
  const validation = validatePageArtifactSet(artifacts);
  return { pageId, runtime, artifacts, validation };
}

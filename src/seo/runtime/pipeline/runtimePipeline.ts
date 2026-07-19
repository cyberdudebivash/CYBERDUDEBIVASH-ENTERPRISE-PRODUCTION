import type { RelationshipGraph } from "../../relationships";
import type { SEOValidationReport } from "../../reports";
import {
  resolvePage,
  buildValidatedConfigurationReport,
  integrateMetadata,
  integrateSchema,
  buildValidatedRelationshipGraph,
  integrateRelationships,
  integrateCommercial,
} from "../integration";
import { buildDiagnostics } from "../diagnostics";
import type { SEORuntimeResult } from "../contracts/types";

// runtimePipeline — the deterministic execution order this phase's
// PIPELINE section specifies:
//
//   Configuration -> Validation -> Metadata -> Schema -> Relationships
//   -> Commercial -> Diagnostics -> Runtime Result
//
// Every stage is one integration/*.ts call; this function composes
// them in order and does nothing else. `graph` and `configReport` are
// optional so a caller processing multiple pages (getRuntimeHealth(),
// createSEORuntime()'s cache) can build each exactly once and reuse it
// across every page, rather than this function silently rebuilding
// them per call — see cache/ and health/.

export function runPipeline(
  pageId: string,
  graph: RelationshipGraph = buildValidatedRelationshipGraph(),
  configurationReport: SEOValidationReport = buildValidatedConfigurationReport(),
): SEORuntimeResult {
  const startedAt = performance.now();

  const page = resolvePage(pageId);
  const metadata = integrateMetadata(page);
  const schemas = integrateSchema(page);
  const relationships = integrateRelationships(pageId, graph);
  const commercial = integrateCommercial(pageId);

  const executionTimeMs = performance.now() - startedAt;

  const diagnostics = buildDiagnostics({
    pageId,
    metadata,
    schemas,
    relationships,
    relationshipGraph: graph,
    commercial,
    configurationReport,
    executionTimeMs,
  });

  return { metadata, schemas, relationships, commercial, diagnostics };
}

import {
  buildRelationshipGraph,
  generateAllRecommendationsFor,
  validateRelationshipGraph,
  validateRecommendations,
} from "../../relationships";
import type { RelationshipGraph, RelationshipRecommendation } from "../../relationships";
import { errorSeverity, throwForRelationshipIssues } from "./classifyIssues";

// relationshipIntegration — composes Phase 1.3's graph builder,
// recommendation generator, and both of its validators. The graph
// itself is expensive to build relative to everything else in this
// pipeline (43 nodes / 107 edges derived from every config
// collection), so callers that process multiple pages build it once
// and pass it to integrateRelationships() for every page — see
// pipeline/runtimePipeline.ts and cache/.

/** Builds the relationship graph and validates it once. Every recommendation this platform generates traces back to one graph, built and validated exactly once per call — never rebuilt silently inside a loop. */
export function buildValidatedRelationshipGraph(): RelationshipGraph {
  const graph = buildRelationshipGraph();
  const errors = errorSeverity(validateRelationshipGraph(graph).issues);
  if (errors.length > 0) {
    throwForRelationshipIssues("buildValidatedRelationshipGraph", errors);
  }
  return graph;
}

/** Every recommendation for one page, validated against `graph` before being returned — "every generated recommendation must resolve." */
export function integrateRelationships(pageId: string, graph: RelationshipGraph): RelationshipRecommendation[] {
  const recommendations = generateAllRecommendationsFor(graph, "page", pageId);
  const errors = errorSeverity(validateRecommendations(recommendations, graph).issues);
  if (errors.length > 0) {
    throwForRelationshipIssues(`integrateRelationships("${pageId}")`, errors);
  }
  return recommendations;
}

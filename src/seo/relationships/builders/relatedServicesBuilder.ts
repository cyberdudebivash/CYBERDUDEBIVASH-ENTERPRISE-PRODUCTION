import { generateRecommendationsFor } from "../graph/recommendationEngine";
import type { RelationshipGraph, RelationshipEntityKind, RelationshipRecommendation } from "../graph/types";

export function buildRelatedServices(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, limit?: number): RelationshipRecommendation[] {
  return generateRecommendationsFor(graph, kind, refId, "service", limit);
}

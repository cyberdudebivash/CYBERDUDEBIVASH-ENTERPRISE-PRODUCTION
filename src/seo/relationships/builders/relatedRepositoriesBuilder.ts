import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedRepositoriesBuilder — reserved: knowledge-graph.config.ts
// reserves a "GitHubRepository" entity type, but no config file models
// any real repository today. Callers supply candidates directly.

export function buildRelatedRepositories(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "repository", limit);
}

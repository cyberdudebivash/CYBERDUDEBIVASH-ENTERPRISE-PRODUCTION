import { generateRecommendationsFor } from "../graph/recommendationEngine";
import type { RelationshipGraph, RelationshipEntityKind, RelationshipRecommendation } from "../graph/types";

// RelatedArticlesBuilder — real mechanism (blog.config.ts's 3 articles,
// shared-category signal), but the 3 real articles each sit in a
// distinct category today, so this returns [] against the real graph
// currently. Not a bug — see RECOMMENDATION_STRATEGY.md.

export function buildRelatedArticles(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, limit?: number): RelationshipRecommendation[] {
  return generateRecommendationsFor(graph, kind, refId, "article", limit);
}

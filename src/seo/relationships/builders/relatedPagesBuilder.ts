import { generateRecommendationsFor } from "../graph/recommendationEngine";
import type { RelationshipGraph, RelationshipEntityKind, RelationshipRecommendation } from "../graph/types";

// RelatedPagesBuilder — page-to-page relationships, derived from two
// pages both referencing the same product/service/solution via their
// own relatedEntityIds (a real example: "home" and "apps" both list
// "tools"), or sharing a primaryKeyword. No page currently lists
// another page's id directly in relatedEntityIds, so the `explicit`
// signal never fires page-to-page today — only the shared-target and
// shared-keyword signals do.

export function buildRelatedPages(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, limit?: number): RelationshipRecommendation[] {
  return generateRecommendationsFor(graph, kind, refId, "page", limit);
}

import { generateRecommendationsFor } from "../graph/recommendationEngine";
import type { RelationshipGraph, RelationshipEntityKind, RelationshipRecommendation } from "../graph/types";

// RelatedProductsBuilder — every PRODUCTS entity related to the given
// source, via explicit relatedX references or a shared-product/service/
// keyword signal already present in the graph. A thin, named wrapper
// around the graph's own generic lookup — see graph/recommendationEngine.ts.

export function buildRelatedProducts(graph: RelationshipGraph, kind: RelationshipEntityKind, refId: string, limit?: number): RelationshipRecommendation[] {
  return generateRecommendationsFor(graph, kind, refId, "product", limit);
}

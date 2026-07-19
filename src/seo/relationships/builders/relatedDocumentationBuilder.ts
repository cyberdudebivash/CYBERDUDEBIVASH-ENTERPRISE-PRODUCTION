import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedDocumentationBuilder — reserved: knowledge-graph.config.ts
// reserves a "Documentation" entity type, but no config file models
// user-facing documentation content (the markdown files under docs/
// are this program's own internal process records, not SEO content
// entities). Callers supply candidates directly.

export function buildRelatedDocumentation(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "documentation", limit);
}

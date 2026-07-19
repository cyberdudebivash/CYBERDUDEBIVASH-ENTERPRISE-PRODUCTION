import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedDownloadsBuilder — reserved: knowledge-graph.config.ts's
// KnowledgeGraphEntityType already reserves a "Download" slot, but no
// config file models any real downloadable entity today (distinct from
// solutions.config.ts's SOLUTIONS, the real, priced Gumroad kits — see
// RELATIONSHIP_MAPPING_MATRIX.md). Callers supply candidates directly;
// nothing here defaults to fabricated data.

export function buildRelatedDownloads(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "download", limit);
}

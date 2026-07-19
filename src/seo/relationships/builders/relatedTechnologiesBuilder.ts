import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedTechnologiesBuilder — reserved: no SEOTechnology type or
// technologies config exists anywhere in this data model. Implemented
// for reusability per this phase's instruction; callers supply
// candidates directly rather than this defaulting to an invented
// taxonomy.

export function buildRelatedTechnologies(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "technology", limit);
}

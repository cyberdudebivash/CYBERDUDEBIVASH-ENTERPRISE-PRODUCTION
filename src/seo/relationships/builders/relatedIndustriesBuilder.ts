import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedIndustriesBuilder — reserved: no SEOIndustry type or industries
// config exists anywhere in this data model (SEOProduct.audience is
// roles/personas — "SOC Analysts," "MSSPs" — not industries).
// Implemented for reusability per this phase's instruction; callers
// supply candidates directly rather than this defaulting to an
// invented taxonomy.

export function buildRelatedIndustries(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "industry", limit);
}

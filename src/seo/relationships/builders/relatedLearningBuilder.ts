import { buildReservedRelated } from "./reservedRelationshipBuilder";
import type { RelatableCandidate, RelationshipRecommendation } from "../graph/types";

// RelatedLearningBuilder — reserved: Phase 1.0's InternalLinkRelationType
// already reserves "relatedLearning," but no config models course/learning
// content distinctly from solutions.config.ts's guide/toolkit-format
// SOLUTIONS. Callers supply candidates directly.

export function buildRelatedLearning(candidates: readonly RelatableCandidate[], sourceId: string, limit?: number): RelationshipRecommendation[] {
  return buildReservedRelated(candidates, sourceId, "learning", limit);
}

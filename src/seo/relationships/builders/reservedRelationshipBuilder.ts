import { typeForKind } from "../graph/buildGraph";
import { SIGNAL_WEIGHTS } from "../ranking/signals";
import { rankRecommendations } from "../ranking/rankRecommendations";
import type { RelatableCandidate, RelationshipEntityKind, RelationshipRecommendation } from "../graph/types";

// Shared implementation behind every reserved (no-config-backing)
// builder — relatedDownloadsBuilder.ts and its 5 siblings. Not one of
// this phase's 13 named builders itself; exists so those 6 don't each
// duplicate "map candidates to recommendations, rank, return." Callers
// always supply candidates directly — there is no config collection to
// default to for any of these 6 kinds (see types.ts's
// RelationshipEntityKind comment and RELATIONSHIP_MAPPING_MATRIX.md).

export function buildReservedRelated(
  candidates: readonly RelatableCandidate[],
  sourceId: string,
  targetKind: RelationshipEntityKind,
  limit?: number,
): RelationshipRecommendation[] {
  const recommendations: RelationshipRecommendation[] = candidates
    .filter((candidate) => candidate.id !== sourceId)
    .map((candidate) => ({
      sourceId,
      targetId: candidate.id,
      targetKind,
      relationType: typeForKind(targetKind),
      signal: "explicit",
      weight: SIGNAL_WEIGHTS.explicit,
      anchorText: candidate.name,
    }));
  return rankRecommendations(recommendations, limit);
}

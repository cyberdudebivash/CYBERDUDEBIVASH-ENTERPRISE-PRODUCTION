import type { RelationshipRecommendation } from "../graph/types";

// Deterministic ranking only: sorts by weight (descending), breaking
// ties by targetId (ascending, stable) — never by insertion order,
// randomness, or any scoring model. The same input always produces the
// same output, satisfying this phase's "the graph must be
// deterministic" / "deterministic only" requirements.

export function rankRecommendations(recommendations: readonly RelationshipRecommendation[], limit?: number): RelationshipRecommendation[] {
  const sorted = [...recommendations].sort((a, b) => b.weight - a.weight || a.targetId.localeCompare(b.targetId));
  return limit !== undefined ? sorted.slice(0, limit) : sorted;
}

/** Keeps the first (highest-ranked, since callers rank before deduping) recommendation per (targetId, relationType) pair. */
export function dedupeRecommendations(recommendations: readonly RelationshipRecommendation[]): RelationshipRecommendation[] {
  const seen = new Set<string>();
  const result: RelationshipRecommendation[] = [];
  for (const rec of recommendations) {
    const key = `${rec.targetId}::${rec.relationType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(rec);
  }
  return result;
}

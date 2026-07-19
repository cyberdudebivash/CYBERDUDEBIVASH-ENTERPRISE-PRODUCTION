import { issue, makeResult, findDuplicates, type ValidationIssue, type ValidationResult } from "../../validators/shared";
import type { RelationshipGraph, RelationshipRecommendation } from "../graph/types";

// RelationshipValidator — reuses Phase 1.0.5's validation primitives
// (issue/makeResult/findDuplicates from validators/shared.ts) rather
// than a parallel vocabulary — the same reasoning, and the same
// physical isolation under src/seo/relationships/ rather than
// src/seo/validators/, as Phase 1.1's MetadataValidator and Phase
// 1.2's SchemaValidator. See documentation/RELATIONSHIP_ENGINE.md's
// Architecture Decisions.
//
// Deliberately does NOT re-implement category-parentCategory cycle
// detection: Phase 1.0.5's validateRelationships.ts already owns that
// check exhaustively (its own detectCategoryCycles), and this phase's
// governance section says "never duplicate business logic." This
// graph's own edges are various forms of symmetric "relatedTo" — A
// relates to B, B relates to A is the expected shape there, not a
// cycle error — so "cyclic errors where inappropriate" is satisfied by
// deliberately *not* flagging that expected symmetry as an error, while
// relying on the pre-existing, already-run check for the one case
// (category parent hierarchy) where a cycle genuinely would be wrong.

export function validateRelationshipGraph(graph: RelationshipGraph): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const edge of graph.edges) {
    if (edge.from === edge.to) {
      issues.push(issue("error", "RELATIONSHIP_SELF_REFERENCE", `Node "${edge.from}" has a "${edge.type}" edge to itself`, edge.from));
    }
    if (!nodeIds.has(edge.from)) {
      issues.push(issue("error", "RELATIONSHIP_DANGLING_SOURCE", `Edge references unresolved source node "${edge.from}"`, edge.from));
    }
    if (!nodeIds.has(edge.to)) {
      issues.push(issue("error", "RELATIONSHIP_DANGLING_TARGET", `Edge from "${edge.from}" references unresolved target node "${edge.to}"`, edge.to));
    }
  }

  // Keyed including `signal`, not just from/to/type: the same target
  // legitimately being reachable via two different signals (e.g.
  // "research" -> "blog" is both an explicit relatedEntityIds reference
  // AND a sharedKeyword match — real, corroborating evidence, not a
  // bug) must not be flagged here. Only a true accidental duplicate —
  // the same signal producing the same edge twice — is an error.
  for (const [key, group] of findDuplicates(graph.edges, (edge) => `${edge.from}::${edge.to}::${edge.type}::${edge.signal}`)) {
    issues.push(issue("error", "RELATIONSHIP_DUPLICATE_EDGE", `${group.length} identical "${group[0].type}" (${group[0].signal}) edges exist for ${key}`, key));
  }

  const touched = new Set<string>();
  for (const edge of graph.edges) {
    touched.add(edge.from);
    touched.add(edge.to);
  }
  for (const node of graph.nodes) {
    if (!touched.has(node.id)) {
      issues.push(issue("warning", "RELATIONSHIP_ORPHAN_NODE", `Node "${node.id}" (${node.kind} "${node.name}") has no relationship touching it`, node.id));
    }
  }

  return makeResult("validateRelationshipGraph", issues);
}

/**
 * Checked against `graph` — the real config-derived graph, for the 6
 * config-backed builders. The 6 reserved builders' output (candidates
 * the caller supplies directly) isn't meant to be checked against this
 * same graph, since it deliberately has no nodes of those 6 kinds —
 * see RelatableCandidate's own callers for why.
 */
export function validateRecommendations(recommendations: readonly RelationshipRecommendation[], graph: RelationshipGraph): ValidationResult {
  const issues: ValidationIssue[] = [];
  const knownTargets = new Set(graph.nodes.map((node) => `${node.kind}::${node.refId}`));

  for (const rec of recommendations) {
    // A bare id match isn't sufficient on its own: "vciso" is both a
    // real page id and a real service id (SEO_VALIDATION_REPORT.md's
    // Configuration Health section already documents this collision).
    // Only flagged when sourceKind is either unknown or matches
    // targetKind — i.e. this is truly the same entity, not two
    // different entities that happen to share an id string.
    if (rec.sourceId === rec.targetId && (rec.sourceKind === undefined || rec.sourceKind === rec.targetKind)) {
      issues.push(issue("error", "RECOMMENDATION_SELF_REFERENCE", `Recommendation for "${rec.sourceId}" points at itself`, rec.sourceId));
    }
    if (!knownTargets.has(`${rec.targetKind}::${rec.targetId}`)) {
      issues.push(
        issue("error", "RECOMMENDATION_DANGLING_TARGET", `Recommendation "${rec.sourceId}" -> "${rec.targetId}" (${rec.targetKind}) does not resolve to a real entity`, rec.targetId),
      );
    }
  }

  for (const [key, group] of findDuplicates(recommendations, (rec) => `${rec.sourceId}::${rec.targetId}::${rec.relationType}`)) {
    issues.push(issue("error", "RECOMMENDATION_DUPLICATE", `${group.length} identical recommendations exist for ${key}`, key));
  }

  return makeResult("validateRecommendations", issues);
}

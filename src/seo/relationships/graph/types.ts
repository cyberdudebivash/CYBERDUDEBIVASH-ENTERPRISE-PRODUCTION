import type { InternalLinkRelationType } from "../../types/internal-linking";

// Owns: the Relationship Graph's own shapes. Composes
// InternalLinkRelationType (Phase 1.0) rather than redeclaring its 8
// values, extending only with the kinds this graph needs that Phase
// 1.0 didn't anticipate a graph needing (page-to-page and
// category-to-category relatedness, plus two reserved-but-unbacked
// kinds — see RELATIONSHIP_MAPPING_MATRIX.md).
//
// Node ids use a "rel-<kind>-<refId>" convention deliberately distinct
// from the Schema Platform's "<url>#<fragment>" @id convention (Phase
// 1.2) and knowledge-graph.config.ts's "kg-<kind>-<refId>" convention
// (Phase 1.0) — three different graph-like structures now exist in
// this codebase for three different purposes; this prefix keeps their
// identifiers from ever being confused with one another.

/**
 * The first 6 back real, populated config collections. The last 6 are
 * reserved, mirroring how knowledge-graph.config.ts's own
 * KnowledgeGraphEntityType already reserves "Documentation" | "Download"
 * | "GitHubRepository" ahead of any real data existing for them — the
 * Relationship Graph never actually constructs a node of these 6 kinds
 * (buildGraph.ts has no config collection to build one from), but their
 * corresponding builders (builders/relatedDownloadsBuilder.ts etc.) are
 * implemented and reusable the moment real data exists. See
 * RELATIONSHIP_MAPPING_MATRIX.md.
 */
export type RelationshipEntityKind =
  | "page"
  | "product"
  | "service"
  | "solution"
  | "article"
  | "category"
  | "download"
  | "documentation"
  | "learning"
  | "repository"
  | "industry"
  | "technology";

/** The minimal shape a caller supplies directly to a reserved (no-config-backing) builder — see builders/relatedDownloadsBuilder.ts and its siblings. */
export interface RelatableCandidate {
  id: string;
  name: string;
}

export type RelationshipType = InternalLinkRelationType | "relatedCategory" | "relatedPage" | "relatedIndustry" | "relatedTechnology";

/**
 * What evidence justified an edge. Exactly the 8 signals named in this
 * phase's own instructions ("explicit relationships, shared
 * categories, shared products, shared services, shared keywords,
 * shared industries, shared technologies, commercial priority") — see
 * ranking/signals.ts for each one's fixed weight and
 * RECOMMENDATION_STRATEGY.md for which ones the real data model
 * actually populates today.
 */
export type RelationshipSignal =
  | "explicit"
  | "sharedCategory"
  | "sharedProduct"
  | "sharedService"
  | "sharedKeyword"
  | "sharedIndustry"
  | "sharedTechnology"
  | "commercialPriority";

export interface RelationshipNode {
  id: string;
  kind: RelationshipEntityKind;
  /** The real id in its owning config array (e.g. an SEOProduct.id) — this node is a reference to that record, not a copy of it. */
  refId: string;
  name: string;
}

export interface RelationshipEdge {
  /** RelationshipNode.id */
  from: string;
  /** RelationshipNode.id */
  to: string;
  type: RelationshipType;
  signal: RelationshipSignal;
  weight: number;
}

export interface RelationshipGraph {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

/**
 * The platform's public output — one strongly typed recommendation.
 * Conceptually the generated analog of Phase 1.0's InternalLinkDefinition
 * (same sourceId/targetId/relationType/anchorText fields) plus the
 * fields only a generator can add (targetKind, weight, signal);
 * declared independently rather than via `extends` because
 * InternalLinkDefinition's `relationType: InternalLinkRelationType` is
 * narrower than this platform's own `RelationshipType`, and widening a
 * field through interface extension needs an awkward `Omit` for a
 * three-field gain not worth the type gymnastics.
 */
export interface RelationshipRecommendation {
  sourceId: string;
  /**
   * Known and set by every graph-backed builder (the 6 real named
   * builders) — left `undefined` only by the 7 reserved builders,
   * which have no graph to resolve a source's kind against. Exists
   * because ids are NOT unique across collections in this data model
   * — "vciso" is both a real page id and a real service id (a known,
   * documented ambiguity — see SEO_VALIDATION_REPORT.md's
   * Configuration Health section) — so a bare sourceId/targetId
   * comparison alone cannot safely detect a true self-reference
   * without also checking kind. See validators/relationshipValidator.ts.
   */
  sourceKind?: RelationshipEntityKind;
  targetId: string;
  targetKind: RelationshipEntityKind;
  relationType: RelationshipType;
  signal: RelationshipSignal;
  weight: number;
  anchorText: string;
}

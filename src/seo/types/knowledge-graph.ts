// Owns: the shape of the Knowledge Graph itself — entities and the
// relationships between them. Deliberately does NOT emit JSON-LD (that
// is explicitly Phase 1.2 scope, not 1.0) — this only represents
// "these things exist and relate to each other," as data a future
// generator can walk.

export type KnowledgeGraphEntityType =
  | "Organization"
  | "Brand"
  | "Product"
  | "Service"
  | "Solution"
  | "Article"
  | "Author"
  | "Category"
  | "Documentation"
  | "Download"
  | "GitHubRepository"
  | "Course"
  | "Partner"
  | "ThreatIntelligence";

export interface KnowledgeGraphEntity {
  id: string;
  type: KnowledgeGraphEntityType;
  /** The id of the real record in its owning config file (e.g. an SEOProduct.id in products.config.ts). This is a graph-node reference, not a duplicate copy of that record. */
  refId: string;
  name: string;
}

export type KnowledgeGraphRelationType =
  | "offers"
  | "partOf"
  | "relatedTo"
  | "authoredBy"
  | "publishedBy"
  | "memberOf"
  | "sameAs"
  | "mentions"
  | "dependsOn";

export interface KnowledgeGraphRelationship {
  /** KnowledgeGraphEntity.id */
  from: string;
  /** KnowledgeGraphEntity.id */
  to: string;
  type: KnowledgeGraphRelationType;
}

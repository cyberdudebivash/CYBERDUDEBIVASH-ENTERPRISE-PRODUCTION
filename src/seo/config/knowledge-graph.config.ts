import type { KnowledgeGraphEntity, KnowledgeGraphRelationship } from "../types/knowledge-graph";
import { ORGANIZATION, BRANDS } from "./organization.config";
import { PRODUCTS } from "./products.config";
import { SERVICES } from "./services.config";
import { SOLUTIONS } from "./solutions.config";
import { AUTHORS } from "./authors.config";
import { BLOG_ARTICLES } from "./blog.config";

// Owns: the graph itself — every entity from every other config file,
// represented as a node, plus the relationships between them. Composed
// programmatically from the arrays those files already export rather
// than re-listing entities by hand, so this can never drift out of
// sync with products.config.ts/services.config.ts/etc. Still does NOT
// emit JSON-LD (explicitly Phase 1.2 scope) — this is entities and
// edges only.

export const KNOWLEDGE_GRAPH_ENTITIES: KnowledgeGraphEntity[] = [
  { id: "kg-org", type: "Organization", refId: ORGANIZATION.id, name: ORGANIZATION.name },
  ...BRANDS.map((b): KnowledgeGraphEntity => ({ id: `kg-brand-${b.id}`, type: "Brand", refId: b.id, name: b.name })),
  ...PRODUCTS.map((p): KnowledgeGraphEntity => ({ id: `kg-product-${p.id}`, type: "Product", refId: p.id, name: p.name })),
  ...SERVICES.map((s): KnowledgeGraphEntity => ({ id: `kg-service-${s.id}`, type: "Service", refId: s.id, name: s.name })),
  ...SOLUTIONS.map((s): KnowledgeGraphEntity => ({ id: `kg-solution-${s.id}`, type: "Solution", refId: s.id, name: s.name })),
  ...AUTHORS.map((a): KnowledgeGraphEntity => ({ id: `kg-author-${a.id}`, type: "Author", refId: a.id, name: a.name })),
  ...BLOG_ARTICLES.map((a): KnowledgeGraphEntity => ({ id: `kg-article-${a.id}`, type: "Article", refId: a.id, name: a.title })),
];

function entityIdFor(type: KnowledgeGraphEntity["type"], refId: string): string {
  const match = KNOWLEDGE_GRAPH_ENTITIES.find((e) => e.type === type && e.refId === refId);
  if (!match) throw new Error(`knowledge-graph.config.ts: no ${type} entity found for refId "${refId}"`);
  return match.id;
}

// Relationships derived from each entity's own relatedX fields — same
// principle as the entities above: computed from the existing data,
// not hand-maintained as a second, easily-out-of-sync list.
export const KNOWLEDGE_GRAPH_RELATIONSHIPS: KnowledgeGraphRelationship[] = [
  ...BRANDS.map((b): KnowledgeGraphRelationship => ({
    from: entityIdFor("Brand", b.id),
    to: entityIdFor("Organization", ORGANIZATION.id),
    type: "partOf",
  })),
  ...PRODUCTS.flatMap((p) => [
    ...(p.relatedServices ?? []).map((sid): KnowledgeGraphRelationship => ({
      from: entityIdFor("Product", p.id),
      to: entityIdFor("Service", sid),
      type: "relatedTo",
    })),
  ]),
  ...SERVICES.flatMap((s) => [
    ...(s.relatedProducts ?? []).map((pid): KnowledgeGraphRelationship => ({
      from: entityIdFor("Service", s.id),
      to: entityIdFor("Product", pid),
      type: "relatedTo",
    })),
    ...(s.relatedSolutions ?? []).map((sid): KnowledgeGraphRelationship => ({
      from: entityIdFor("Service", s.id),
      to: entityIdFor("Solution", sid),
      type: "relatedTo",
    })),
  ]),
  ...BLOG_ARTICLES.map((a): KnowledgeGraphRelationship => ({
    from: entityIdFor("Article", a.id),
    to: entityIdFor("Author", a.authorId),
    type: "authoredBy",
  })),
];

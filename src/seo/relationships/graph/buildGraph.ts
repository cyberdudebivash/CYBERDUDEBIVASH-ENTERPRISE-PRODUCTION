import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, BLOG_ARTICLES, BLOG_CATEGORIES, RESEARCH_CATEGORIES } from "../../config";
import { SIGNAL_WEIGHTS } from "../ranking/signals";
import type { RelationshipNode, RelationshipEdge, RelationshipGraph, RelationshipEntityKind, RelationshipType, RelationshipSignal } from "./types";

// Constructs the Relationship Graph entirely from src/seo/config/ —
// never from HTML, the DOM, or the filesystem. Every edge traces to
// one of two things: (1) a real, existing relatedX/relatedEntityIds/
// categoryIds field already validated by Phase 1.0.5's own
// validateRelationships.ts, or (2) a computed "shared signal" —
// keyword/category/product/service/commercialPriority equality — using
// only fields that already exist in the data model. Nothing here reads
// HTML link structure to decide what "should" be linked; that would be
// exactly the page-specific hardcoding this phase is built to avoid.

export function nodeId(kind: RelationshipEntityKind, refId: string): string {
  return `rel-${kind}-${refId}`;
}

/** Exhaustive over all 12 RelationshipEntityKind values, even though buildRelationshipGraph() below only ever constructs nodes of the first 6 — the last 6 (download/documentation/learning/repository/industry/technology) are reserved for builders/ callers that supply their own candidates directly (see types.ts). */
export function typeForKind(kind: RelationshipEntityKind): RelationshipType {
  switch (kind) {
    case "product":
      return "relatedProduct";
    case "service":
      return "relatedService";
    case "solution":
      return "relatedSolution";
    case "article":
      return "relatedArticle";
    case "category":
      return "relatedCategory";
    case "page":
      return "relatedPage";
    case "download":
      return "relatedDownload";
    case "documentation":
      return "relatedDocumentation";
    case "learning":
      return "relatedLearning";
    case "repository":
      return "relatedRepository";
    case "industry":
      return "relatedIndustry";
    case "technology":
      return "relatedTechnology";
  }
}

/**
 * `blog.config.ts`'s and `research.config.ts`'s category ids don't
 * collide today (verified), but nothing in the data model guarantees
 * that — the same latent cross-collection ambiguity Phase 1.0.5's own
 * report already documented for "vciso" (used as both a page id and a
 * service id). Guarded here by keeping the first occurrence rather
 * than silently creating two nodes with the same id.
 */
function buildCategoryNodes(): RelationshipNode[] {
  const seen = new Set<string>();
  const nodes: RelationshipNode[] = [];
  for (const category of [...BLOG_CATEGORIES, ...RESEARCH_CATEGORIES]) {
    if (seen.has(category.id)) continue;
    seen.add(category.id);
    nodes.push({ id: nodeId("category", category.id), kind: "category", refId: category.id, name: category.name });
  }
  return nodes;
}

function buildNodes(): RelationshipNode[] {
  return [
    ...PAGES.map((p): RelationshipNode => ({ id: nodeId("page", p.id), kind: "page", refId: p.id, name: p.title })),
    ...PRODUCTS.map((p): RelationshipNode => ({ id: nodeId("product", p.id), kind: "product", refId: p.id, name: p.name })),
    ...SERVICES.map((s): RelationshipNode => ({ id: nodeId("service", s.id), kind: "service", refId: s.id, name: s.name })),
    ...SOLUTIONS.map((s): RelationshipNode => ({ id: nodeId("solution", s.id), kind: "solution", refId: s.id, name: s.name })),
    ...BLOG_ARTICLES.map((a): RelationshipNode => ({ id: nodeId("article", a.id), kind: "article", refId: a.id, name: a.title })),
    ...buildCategoryNodes(),
  ];
}

interface ExplicitRef {
  sourceNodeId: string;
  sourceKind: RelationshipEntityKind;
  targetKind: RelationshipEntityKind;
  targetRefId: string;
}

/**
 * Every authored relatedX / relatedEntityIds / categoryIds reference in
 * the data model, in one place. An unresolved id (a page referencing an
 * entity id that doesn't exist) is silently skipped here, not because
 * it's fine — Phase 1.0.5's `validateRelationships.ts`
 * (`PAGE_RELATED_ENTITY_UNRESOLVED` etc.) already catches that at the
 * config level; this graph simply never materializes an edge for
 * something Phase 1.0.5 already flags as broken, rather than
 * re-validating it a second time.
 */
function collectExplicitRefs(): ExplicitRef[] {
  const refs: ExplicitRef[] = [];
  const push = (sourceNodeId: string, sourceKind: RelationshipEntityKind, targetKind: RelationshipEntityKind, targetRefId: string) => {
    refs.push({ sourceNodeId, sourceKind, targetKind, targetRefId });
  };

  for (const product of PRODUCTS) {
    for (const id of product.relatedServices ?? []) push(nodeId("product", product.id), "product", "service", id);
    for (const id of product.relatedSolutions ?? []) push(nodeId("product", product.id), "product", "solution", id);
  }
  for (const service of SERVICES) {
    for (const id of service.relatedProducts ?? []) push(nodeId("service", service.id), "service", "product", id);
    for (const id of service.relatedSolutions ?? []) push(nodeId("service", service.id), "service", "solution", id);
  }
  for (const solution of SOLUTIONS) {
    for (const id of solution.relatedProducts ?? []) push(nodeId("solution", solution.id), "solution", "product", id);
    for (const id of solution.relatedServices ?? []) push(nodeId("solution", solution.id), "solution", "service", id);
  }
  for (const article of BLOG_ARTICLES) {
    for (const id of article.categoryIds ?? []) push(nodeId("article", article.id), "article", "category", id);
  }

  const kindByRefId = new Map<string, RelationshipEntityKind>();
  for (const p of PRODUCTS) kindByRefId.set(p.id, "product");
  for (const s of SERVICES) kindByRefId.set(s.id, "service");
  for (const s of SOLUTIONS) kindByRefId.set(s.id, "solution");
  for (const a of BLOG_ARTICLES) kindByRefId.set(a.id, "article");
  for (const page of PAGES) {
    for (const id of page.relatedEntityIds ?? []) {
      const kind = kindByRefId.get(id);
      if (!kind) continue;
      push(nodeId("page", page.id), "page", kind, id);
    }
  }

  return refs;
}

function buildDirectExplicitEdges(refs: readonly ExplicitRef[]): RelationshipEdge[] {
  return refs.map((ref) => ({
    from: ref.sourceNodeId,
    to: nodeId(ref.targetKind, ref.targetRefId),
    type: typeForKind(ref.targetKind),
    signal: "explicit",
    weight: SIGNAL_WEIGHTS.explicit,
  }));
}

/**
 * Two different sources that both explicitly reference the same
 * product or service are thereby related to each other through it —
 * e.g. `services.config.ts`'s "soc" and "mssp" both list
 * `relatedProducts: ["apex"]`; `seo.config.ts`'s "home" and "apps"
 * pages both list "tools" in `relatedEntityIds`. Deliberately scoped
 * to product/service targets only — those are the two signals this
 * phase names ("shared products," "shared services"); a shared
 * *solution* target has no corresponding named signal and, checked
 * against the real data, never actually occurs anyway (every solution
 * is referenced by at most one other entity today).
 *
 * Deduped by (from, to, signal) after grouping: two sources that share
 * *two* targets (e.g. both "apex" and "official" independently list
 * both "soc" and "mssp") would otherwise produce the same edge twice —
 * once per shared target — which is a real duplicate, not two
 * different pieces of evidence (unlike an explicit edge and a
 * sharedKeyword edge between the same pair, which are genuinely
 * different signals and rightly coexist).
 */
function buildSharedTargetEdges(refs: readonly ExplicitRef[]): RelationshipEdge[] {
  const bySharedTarget = new Map<string, ExplicitRef[]>();
  for (const ref of refs) {
    if (ref.targetKind !== "product" && ref.targetKind !== "service") continue;
    const key = `${ref.targetKind}:${ref.targetRefId}`;
    const list = bySharedTarget.get(key) ?? [];
    list.push(ref);
    bySharedTarget.set(key, list);
  }
  const edgesByKey = new Map<string, RelationshipEdge>();
  for (const group of bySharedTarget.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      for (const b of group) {
        if (a.sourceNodeId === b.sourceNodeId) continue;
        const signal: RelationshipSignal = b.targetKind === "product" ? "sharedProduct" : "sharedService";
        const edgeKey = `${a.sourceNodeId}::${b.sourceNodeId}::${signal}`;
        if (!edgesByKey.has(edgeKey)) {
          edgesByKey.set(edgeKey, { from: a.sourceNodeId, to: b.sourceNodeId, type: typeForKind(b.sourceKind), signal, weight: SIGNAL_WEIGHTS[signal] });
        }
      }
    }
  }
  return [...edgesByKey.values()];
}

interface KeywordEntity {
  nodeId: string;
  kind: RelationshipEntityKind;
  primaryKeyword?: string;
}

function collectKeywordEntities(): KeywordEntity[] {
  return [
    ...PAGES.map((p): KeywordEntity => ({ nodeId: nodeId("page", p.id), kind: "page", primaryKeyword: p.primaryKeyword })),
    ...PRODUCTS.map((p): KeywordEntity => ({ nodeId: nodeId("product", p.id), kind: "product", primaryKeyword: p.primaryKeyword })),
    ...SERVICES.map((s): KeywordEntity => ({ nodeId: nodeId("service", s.id), kind: "service", primaryKeyword: s.primaryKeyword })),
    ...SOLUTIONS.map((s): KeywordEntity => ({ nodeId: nodeId("solution", s.id), kind: "solution", primaryKeyword: s.primaryKeyword })),
    ...BLOG_ARTICLES.map((a): KeywordEntity => ({ nodeId: nodeId("article", a.id), kind: "article", primaryKeyword: a.primaryKeyword })),
  ];
}

/**
 * Two entities sharing an exact `primaryKeyword` — the same real
 * relationship Phase 1.0.5's `validateKeywords.ts` reports as
 * `KEYWORD_CANNIBALIZATION` (2 real pairs today: the "research" page
 * with the "blog" product, and the "threat-intel" page with the "apex"
 * product). Surfaced here as a graph edge rather than only a
 * validation warning — the same evidence, a different, complementary
 * use (a candidate relationship, not just a problem to fix).
 */
function buildSharedKeywordEdges(): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const byKeyword = new Map<string, KeywordEntity[]>();
  for (const entity of collectKeywordEntities()) {
    if (!entity.primaryKeyword) continue;
    const list = byKeyword.get(entity.primaryKeyword) ?? [];
    list.push(entity);
    byKeyword.set(entity.primaryKeyword, list);
  }
  for (const group of byKeyword.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      for (const b of group) {
        if (a.nodeId === b.nodeId) continue;
        edges.push({ from: a.nodeId, to: b.nodeId, type: typeForKind(b.kind), signal: "sharedKeyword", weight: SIGNAL_WEIGHTS.sharedKeyword });
      }
    }
  }
  return edges;
}

/**
 * Two articles sharing a `categoryIds` entry. Real mechanism, real
 * category data (3 blog categories) — but the 3 real blog articles
 * each sit in a distinct category today, so this produces zero edges
 * against the real data currently. Not a bug — see
 * RECOMMENDATION_STRATEGY.md.
 */
function buildSharedCategoryEdges(): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const byCategory = new Map<string, string[]>();
  for (const article of BLOG_ARTICLES) {
    for (const categoryId of article.categoryIds ?? []) {
      const list = byCategory.get(categoryId) ?? [];
      list.push(nodeId("article", article.id));
      byCategory.set(categoryId, list);
    }
  }
  for (const articleNodeIds of byCategory.values()) {
    if (articleNodeIds.length < 2) continue;
    for (const a of articleNodeIds) {
      for (const b of articleNodeIds) {
        if (a !== b) edges.push({ from: a, to: b, type: "relatedArticle", signal: "sharedCategory", weight: SIGNAL_WEIGHTS.sharedCategory });
      }
    }
  }
  return edges;
}

interface PriorityEntity {
  nodeId: string;
  kind: RelationshipEntityKind;
  commercialPriority?: string;
}

function collectPriorityEntities(): PriorityEntity[] {
  return [
    ...PAGES.map((p): PriorityEntity => ({ nodeId: nodeId("page", p.id), kind: "page", commercialPriority: p.commercialPriority })),
    ...PRODUCTS.map((p): PriorityEntity => ({ nodeId: nodeId("product", p.id), kind: "product", commercialPriority: p.commercialPriority })),
    ...SERVICES.map((s): PriorityEntity => ({ nodeId: nodeId("service", s.id), kind: "service", commercialPriority: s.commercialPriority })),
    ...SOLUTIONS.map((s): PriorityEntity => ({ nodeId: nodeId("solution", s.id), kind: "solution", commercialPriority: s.commercialPriority })),
  ];
}

/**
 * Two entities sharing the same non-empty `commercialPriority`. Real
 * mechanism — but Phase 1.0.5's own report found this field at 0%
 * coverage across every single entity in the entire model, so this
 * produces zero edges against the real data today. Kept generic and
 * ready rather than omitted, the same way this program has treated
 * every other 0%-coverage field found so far.
 */
function buildCommercialPriorityEdges(): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const byPriority = new Map<string, PriorityEntity[]>();
  for (const entity of collectPriorityEntities()) {
    if (!entity.commercialPriority) continue;
    const list = byPriority.get(entity.commercialPriority) ?? [];
    list.push(entity);
    byPriority.set(entity.commercialPriority, list);
  }
  for (const group of byPriority.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      for (const b of group) {
        if (a.nodeId !== b.nodeId) edges.push({ from: a.nodeId, to: b.nodeId, type: typeForKind(b.kind), signal: "commercialPriority", weight: SIGNAL_WEIGHTS.commercialPriority });
      }
    }
  }
  return edges;
}

export function buildRelationshipGraph(): RelationshipGraph {
  const refs = collectExplicitRefs();
  return {
    nodes: buildNodes(),
    edges: [
      ...buildDirectExplicitEdges(refs),
      ...buildSharedTargetEdges(refs),
      ...buildSharedKeywordEdges(),
      ...buildSharedCategoryEdges(),
      ...buildCommercialPriorityEdges(),
    ],
  };
}

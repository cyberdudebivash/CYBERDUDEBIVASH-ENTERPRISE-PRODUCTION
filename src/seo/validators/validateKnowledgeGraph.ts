import { KNOWLEDGE_GRAPH_ENTITIES, KNOWLEDGE_GRAPH_RELATIONSHIPS, PRODUCTS, SERVICES, SOLUTIONS, BLOG_CATEGORIES, RESEARCH_CATEGORIES } from "../config";
import type { KnowledgeGraphEntity, KnowledgeGraphRelationship, SEOProduct, SEOService, SEOSolution, SEOCategory } from "../types";
import { findDuplicates, issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// Validates the derived Knowledge Graph itself (knowledge-graph.config.ts's
// KNOWLEDGE_GRAPH_ENTITIES / KNOWLEDGE_GRAPH_RELATIONSHIPS) — not the raw
// source fields those are computed from (that's validateRelationships.ts's
// job). This file checks: entity/relationship integrity (no duplicates, no
// unresolved endpoints), reachability (no orphans), and — because the
// graph is *computed* from other config files rather than hand-authored —
// whether that computation actually captured every real relationship the
// source data expresses, so a silently-dropped field doesn't go unnoticed.

export interface KnowledgeGraphInput {
  entities?: readonly KnowledgeGraphEntity[];
  relationships?: readonly KnowledgeGraphRelationship[];
  products?: readonly SEOProduct[];
  services?: readonly SEOService[];
  solutions?: readonly SEOSolution[];
  blogCategories?: readonly SEOCategory[];
  researchCategories?: readonly SEOCategory[];
}

export function validateKnowledgeGraph(input: KnowledgeGraphInput = {}): ValidationResult {
  const entities = input.entities ?? KNOWLEDGE_GRAPH_ENTITIES;
  const relationships = input.relationships ?? KNOWLEDGE_GRAPH_RELATIONSHIPS;
  const products = input.products ?? PRODUCTS;
  const services = input.services ?? SERVICES;
  const solutions = input.solutions ?? SOLUTIONS;
  const blogCategories = input.blogCategories ?? BLOG_CATEGORIES;
  const researchCategories = input.researchCategories ?? RESEARCH_CATEGORIES;

  const issues: ValidationIssue[] = [];
  const entityIds = new Set(entities.map((e) => e.id));

  for (const [id, group] of findDuplicates(entities, (e) => e.id)) {
    issues.push(issue("error", "KG_DUPLICATE_ENTITY_ID", `${group.length} Knowledge Graph entities share id "${id}"`, id));
  }
  for (const [key, group] of findDuplicates(entities, (e) => `${e.type}:${e.refId}`)) {
    issues.push(issue("error", "KG_DUPLICATE_ENTITY_REF", `${group.length} Knowledge Graph entities represent the same ${key}`, group.map((e) => e.id).join(", ")));
  }

  for (const rel of relationships) {
    if (!entityIds.has(rel.from)) {
      issues.push(issue("error", "KG_RELATIONSHIP_FROM_UNRESOLVED", `Relationship "${rel.type}" has an unresolved "from" endpoint "${rel.from}"`, `${rel.from} -> ${rel.to}`));
    }
    if (!entityIds.has(rel.to)) {
      issues.push(issue("error", "KG_RELATIONSHIP_TO_UNRESOLVED", `Relationship "${rel.type}" has an unresolved "to" endpoint "${rel.to}"`, `${rel.from} -> ${rel.to}`));
    }
  }

  const touched = new Set<string>();
  for (const rel of relationships) {
    touched.add(rel.from);
    touched.add(rel.to);
  }
  for (const entity of entities) {
    if (!touched.has(entity.id)) {
      issues.push(issue("warning", "KG_ORPHAN_ENTITY", `Knowledge Graph entity "${entity.id}" (${entity.type} "${entity.name}") has no relationship touching it`, entity.id));
    }
  }

  const typesAsSource = new Set(
    relationships.map((r) => entities.find((e) => e.id === r.from)?.type).filter((t): t is KnowledgeGraphEntity["type"] => t !== undefined),
  );
  const typesPresent = new Set(entities.map((e) => e.type));
  for (const type of typesPresent) {
    if (!typesAsSource.has(type)) {
      issues.push(
        issue("info", "KG_TYPE_NEVER_SOURCE", `Entity type "${type}" never appears as the "from" side of any relationship — it is only ever a target, never itself relating outward to something`, type),
      );
    }
  }

  if (blogCategories.length > 0 || researchCategories.length > 0) {
    if (!typesPresent.has("Category")) {
      issues.push(
        issue(
          "warning",
          "KG_MISSING_CATEGORY_ENTITIES",
          `${blogCategories.length + researchCategories.length} SEOCategory records exist (blog + research) but none are represented as Knowledge Graph entities of type "Category"`,
          "blog+research categories",
        ),
      );
    }
  }

  // Graph completeness: every relatedX field Product/Service/Solution
  // populates should correspond to a relationship edge somewhere — proves
  // the derived graph hasn't silently dropped a real, populated field.
  function hasDirectedEdge(from: string, to: string): boolean {
    return relationships.some((r) => r.from === from && r.to === to);
  }
  function refIdToEntityId(type: KnowledgeGraphEntity["type"], refId: string): string | undefined {
    return entities.find((e) => e.type === type && e.refId === refId)?.id;
  }

  for (const product of products) {
    const productNodeId = refIdToEntityId("Product", product.id);
    if (!productNodeId) continue;
    for (const sid of product.relatedSolutions ?? []) {
      const solutionNodeId = refIdToEntityId("Solution", sid);
      if (!solutionNodeId) continue;
      if (!hasDirectedEdge(productNodeId, solutionNodeId) && !hasDirectedEdge(solutionNodeId, productNodeId)) {
        issues.push(
          issue("warning", "KG_GRAPH_MISSING_EDGE", `Product "${product.id}" lists relatedSolutions "${sid}", but knowledge-graph.config.ts's relationship builder never reads SEOProduct.relatedSolutions — no edge represents it in either direction`, product.id),
        );
      }
    }
  }

  for (const solution of solutions) {
    const solutionNodeId = refIdToEntityId("Solution", solution.id);
    if (!solutionNodeId) continue;
    for (const pid of solution.relatedProducts ?? []) {
      const productNodeId = refIdToEntityId("Product", pid);
      if (!productNodeId) continue;
      if (!hasDirectedEdge(solutionNodeId, productNodeId) && !hasDirectedEdge(productNodeId, solutionNodeId)) {
        issues.push(
          issue("warning", "KG_GRAPH_MISSING_EDGE", `Solution "${solution.id}" lists relatedProducts "${pid}", but knowledge-graph.config.ts's relationship builder never reads SEOSolution.relatedProducts — no edge represents it in either direction`, solution.id),
        );
      }
    }
    for (const sid of solution.relatedServices ?? []) {
      const serviceNodeId = refIdToEntityId("Service", sid);
      if (!serviceNodeId) continue;
      if (hasDirectedEdge(serviceNodeId, solutionNodeId) && !hasDirectedEdge(solutionNodeId, serviceNodeId)) {
        issues.push(
          issue("info", "KG_GRAPH_ASYMMETRIC_EDGE", `Solution "${solution.id}" lists relatedServices "${sid}"; an edge exists but only from the Service's side (built from SEOService.relatedSolutions) — SEOSolution.relatedServices itself is never read by the builder`, solution.id),
        );
      } else if (!hasDirectedEdge(serviceNodeId, solutionNodeId) && !hasDirectedEdge(solutionNodeId, serviceNodeId)) {
        issues.push(issue("warning", "KG_GRAPH_MISSING_EDGE", `Solution "${solution.id}" lists relatedServices "${sid}", but no edge represents it in either direction`, solution.id));
      }
    }
  }

  return makeResult("validateKnowledgeGraph", issues);
}

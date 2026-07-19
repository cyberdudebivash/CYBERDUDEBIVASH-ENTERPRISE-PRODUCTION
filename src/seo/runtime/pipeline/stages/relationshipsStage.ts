import { buildRelationshipGraph } from "../../../relationships/graph/buildGraph";
import { validateRelationshipGraph, validateRecommendations } from "../../../relationships/validators/relationshipValidator";
import { rankRecommendations } from "../../../relationships/ranking/rankRecommendations";
import { buildRelatedPages } from "../../../relationships/builders/relatedPagesBuilder";
import { buildRelatedProducts } from "../../../relationships/builders/relatedProductsBuilder";
import { buildRelatedServices } from "../../../relationships/builders/relatedServicesBuilder";
import { buildRelatedSolutions } from "../../../relationships/builders/relatedSolutionsBuilder";
import { buildRelatedArticles } from "../../../relationships/builders/relatedArticlesBuilder";
import { buildRelatedCategories } from "../../../relationships/builders/relatedCategoriesBuilder";
import { buildRelatedResearch } from "../../../relationships/builders/relatedResearchBuilder";
import type { RelationshipGraph, RelationshipRecommendation } from "../../../relationships/graph/types";
import type { SEOPage } from "../../../types/page";
import type { ValidationIssue } from "../../../validators/shared";
import { RelationshipError } from "../../contracts/errors";

export interface RelationshipsStageResult {
  graph: RelationshipGraph;
  recommendations: RelationshipRecommendation[];
  warnings: ValidationIssue[];
}

// RelationshipsStage — composes Phase 1.3's Relationship Platform.
// Builds the whole-config graph once per call (buildRelationshipGraph()
// takes no arguments — it is not page-scoped), then, for this page,
// composes every graph-backed named builder (page/product/service/
// solution/article/category) plus RelatedResearchBuilder (config-driven,
// not graph-backed, and currently always [] — see
// relatedResearchBuilder.ts). The 6 "reserved" builders
// (download/documentation/learning/repository/industry/technology) are
// deliberately not called: each requires a caller-supplied candidate
// list this platform has no real config source for yet (see
// buildGraph.ts's own header comment on reserved kinds) — calling them
// with an invented candidate list would be exactly the fabricated data
// this program is built to avoid. See documentation/ENGINE_INTEGRATION.md.

function composeRecommendations(graph: RelationshipGraph, page: SEOPage): RelationshipRecommendation[] {
  const recommendations = [
    ...buildRelatedPages(graph, "page", page.id),
    ...buildRelatedProducts(graph, "page", page.id),
    ...buildRelatedServices(graph, "page", page.id),
    ...buildRelatedSolutions(graph, "page", page.id),
    ...buildRelatedArticles(graph, "page", page.id),
    ...buildRelatedCategories(graph, "page", page.id),
    ...buildRelatedResearch(page.id),
  ];
  return rankRecommendations(recommendations);
}

export function runRelationshipsStage(page: SEOPage): RelationshipsStageResult {
  const graph = buildRelationshipGraph();

  const graphValidation = validateRelationshipGraph(graph);
  const graphErrors = graphValidation.issues.filter((issue) => issue.severity === "error");
  if (graphErrors.length > 0) {
    throw new RelationshipError(
      `relationships stage failed: the relationship graph has ${graphErrors.length} error(s) — ${graphErrors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      graphErrors,
    );
  }

  const recommendations = composeRecommendations(graph, page);

  const recommendationValidation = validateRecommendations(recommendations, graph);
  const recommendationErrors = recommendationValidation.issues.filter((issue) => issue.severity === "error");
  if (recommendationErrors.length > 0) {
    throw new RelationshipError(
      `relationships stage failed for page "${page.id}": ${recommendationErrors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      recommendationErrors,
    );
  }

  const warnings = [
    ...graphValidation.issues.filter((issue) => issue.severity === "warning"),
    ...recommendationValidation.issues.filter((issue) => issue.severity === "warning"),
  ];

  return { graph, recommendations, warnings };
}

import { RESEARCH_ARTICLES } from "../../config";
import type { SEOArticle } from "../../types/entities";
import { SIGNAL_WEIGHTS } from "../ranking/signals";
import { rankRecommendations } from "../ranking/rankRecommendations";
import type { RelationshipRecommendation } from "../graph/types";

// RelatedResearchBuilder — defaults to the real RESEARCH_ARTICLES
// array, which is deliberately empty today (see research.config.ts's
// own header comment: durable research-report content doesn't exist
// in this repository yet). Always returns [] against the real default
// currently; ready the moment real research content exists, without
// needing to change. Kept separate from the Relationship Graph itself
// (rather than added as a graph node kind) since an empty collection
// has nothing to build a graph node from yet.

export function buildRelatedResearch(sourceId: string, articles: readonly SEOArticle[] = RESEARCH_ARTICLES, limit?: number): RelationshipRecommendation[] {
  const recommendations: RelationshipRecommendation[] = articles
    .filter((article) => article.id !== sourceId)
    .map((article) => ({
      sourceId,
      targetId: article.id,
      targetKind: "article",
      relationType: "relatedArticle",
      signal: "explicit",
      weight: SIGNAL_WEIGHTS.explicit,
      anchorText: article.title,
    }));
  return rankRecommendations(recommendations, limit);
}

import { buildRelationshipGraph } from "../../relationships/graph/buildGraph";
import type { RelationshipGraph, RelationshipRecommendation } from "../../relationships/graph/types";
import {
  buildRelatedProducts,
  buildRelatedServices,
  buildRelatedSolutions,
  buildRelatedArticles,
  buildRelatedCategories,
  buildRelatedPages,
} from "../../relationships/builders";
import type { CommercialEntityKind } from "../config/types";

// relationshipEnrichment — this phase's RELATIONSHIP ENRICHMENT section
// reuses Phase 1.3's own relationship builders directly rather than
// re-deriving relatedProducts/relatedServices/relatedSolutions/
// relatedArticles logic a second time ("never duplicate business
// logic"). CommercialEntityKind's 5 values are all valid
// RelationshipEntityKind values, so no conversion is needed to call
// Phase 1.3's builders with a commercial entity's own (kind, id).
//
// The 7 relationship kinds this phase's instructions also name
// (relatedResearch, relatedDownloads, relatedDocumentation,
// relatedLearning, relatedTechnologies, relatedIndustries,
// relatedGitHubRepositories) are always [] here: Phase 1.3 already
// established that none of these have real config-backed producers
// today (RELATIONSHIP_MAPPING_MATRIX.md), and this phase introduces no
// new config for them either — populating them now would mean
// fabricating candidate data neither phase has real evidence for. See
// documentation/COMMERCIAL_MODEL.md's Known Risks.

const DEFAULT_GRAPH: RelationshipGraph = buildRelationshipGraph();

export interface RelationshipEnrichment {
  entityId: string;
  entityKind: CommercialEntityKind;
  relatedProducts: RelationshipRecommendation[];
  relatedServices: RelationshipRecommendation[];
  relatedSolutions: RelationshipRecommendation[];
  relatedArticles: RelationshipRecommendation[];
  relatedCategories: RelationshipRecommendation[];
  relatedPages: RelationshipRecommendation[];
  relatedResearch: RelationshipRecommendation[];
  relatedDownloads: RelationshipRecommendation[];
  relatedDocumentation: RelationshipRecommendation[];
  relatedLearning: RelationshipRecommendation[];
  relatedTechnologies: RelationshipRecommendation[];
  relatedIndustries: RelationshipRecommendation[];
  relatedGitHubRepositories: RelationshipRecommendation[];
}

export function buildRelationshipEnrichment(entityKind: CommercialEntityKind, entityId: string, graph: RelationshipGraph = DEFAULT_GRAPH): RelationshipEnrichment {
  return {
    entityId,
    entityKind,
    relatedProducts: buildRelatedProducts(graph, entityKind, entityId),
    relatedServices: buildRelatedServices(graph, entityKind, entityId),
    relatedSolutions: buildRelatedSolutions(graph, entityKind, entityId),
    relatedArticles: buildRelatedArticles(graph, entityKind, entityId),
    relatedCategories: buildRelatedCategories(graph, entityKind, entityId),
    relatedPages: buildRelatedPages(graph, entityKind, entityId),
    relatedResearch: [],
    relatedDownloads: [],
    relatedDocumentation: [],
    relatedLearning: [],
    relatedTechnologies: [],
    relatedIndustries: [],
    relatedGitHubRepositories: [],
  };
}

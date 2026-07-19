import type { CommercialEntityView } from "../config/types";
import type { RelationshipEnrichment } from "../recommendations/relationshipEnrichment";
import type { RelationshipRecommendation } from "../../relationships/graph/types";

// Shared synthetic fixtures for this platform's test suite — not a
// `.test.ts` file itself.

export function makeView(overrides: Partial<CommercialEntityView> = {}): CommercialEntityView {
  return { id: "test-entity", kind: "service", name: "Test Entity", description: "A test entity.", ...overrides };
}

export function makeRecommendation(overrides: Partial<RelationshipRecommendation> = {}): RelationshipRecommendation {
  return { sourceId: "a", targetId: "b", targetKind: "product", relationType: "relatedProduct", signal: "explicit", weight: 100, anchorText: "B", ...overrides };
}

export function makeEnrichment(overrides: Partial<RelationshipEnrichment> = {}): RelationshipEnrichment {
  return {
    entityId: "test-entity",
    entityKind: "service",
    relatedProducts: [],
    relatedServices: [],
    relatedSolutions: [],
    relatedArticles: [],
    relatedCategories: [],
    relatedPages: [],
    relatedResearch: [],
    relatedDownloads: [],
    relatedDocumentation: [],
    relatedLearning: [],
    relatedTechnologies: [],
    relatedIndustries: [],
    relatedGitHubRepositories: [],
    ...overrides,
  };
}

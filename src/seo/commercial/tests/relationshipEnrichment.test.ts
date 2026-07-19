import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRelationshipEnrichment } from "../recommendations/relationshipEnrichment";

test("buildRelationshipEnrichment: soc service gets real relatedProducts and relatedServices from Phase 1.3's graph", () => {
  const enrichment = buildRelationshipEnrichment("service", "soc");
  assert.ok(enrichment.relatedProducts.some((r) => r.targetId === "apex"));
  assert.ok(enrichment.relatedServices.some((r) => r.targetId === "mssp"));
});

test("buildRelationshipEnrichment: the 7 reserved kinds are always empty arrays, never undefined", () => {
  const enrichment = buildRelationshipEnrichment("service", "soc");
  assert.deepEqual(enrichment.relatedResearch, []);
  assert.deepEqual(enrichment.relatedDownloads, []);
  assert.deepEqual(enrichment.relatedDocumentation, []);
  assert.deepEqual(enrichment.relatedLearning, []);
  assert.deepEqual(enrichment.relatedTechnologies, []);
  assert.deepEqual(enrichment.relatedIndustries, []);
  assert.deepEqual(enrichment.relatedGitHubRepositories, []);
});

test("buildRelationshipEnrichment: about page has no real relationship enrichment today (no relatedEntityIds, matching Phase 1.3's own pilot finding)", () => {
  const enrichment = buildRelationshipEnrichment("page", "about");
  assert.deepEqual(enrichment.relatedProducts, []);
  assert.deepEqual(enrichment.relatedServices, []);
  assert.deepEqual(enrichment.relatedPages, []);
});

test("buildRelationshipEnrichment: preserves the given entityId/entityKind", () => {
  const enrichment = buildRelationshipEnrichment("product", "apex");
  assert.equal(enrichment.entityId, "apex");
  assert.equal(enrichment.entityKind, "product");
});

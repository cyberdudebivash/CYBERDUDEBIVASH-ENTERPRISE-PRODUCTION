import { test } from "node:test";
import assert from "node:assert/strict";
import type { SEOPage, SEOProduct, SEOService, KnowledgeGraphEntity, KnowledgeGraphRelationship } from "../../types";
import { validatePages } from "../validatePages";
import { validateProducts } from "../validateProducts";
import { validateRelationships } from "../validateRelationships";
import { validateCommercial } from "../validateCommercial";
import { validateKnowledgeGraph } from "../validateKnowledgeGraph";
import { validateConfiguration } from "../validateConfiguration";
import type { ValidationIssue } from "../shared";

// These exercise the validators against small, synthetic fixtures rather
// than the real Phase 1.0 config — every validator accepts its data as an
// optional parameter for exactly this reason (composability). Covers the
// categories the Phase 1.0.5 spec calls out by name: known-valid entities
// passing cleanly, known-invalid entities being caught, duplicate
// detection, relationship failures, missing-entity/reference failures, and
// commercial validation failures.

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue | undefined {
  return issues.find((i) => i.code === code);
}

function makePage(overrides: Partial<SEOPage> = {}): SEOPage {
  return {
    id: "test-page",
    path: "/test-page.html",
    title: "Test Page",
    description: "A test page.",
    canonical: { path: "/test-page.html" },
    openGraph: { title: "Test Page", description: "A test page.", type: "website", image: { url: "https://example.com/img.png", alt: "Test image" } },
    twitterCard: { card: "summary_large_image", title: "Test Page", description: "A test page." },
    ...overrides,
  };
}

function makeProduct(overrides: Partial<SEOProduct> = {}): SEOProduct {
  return {
    id: "test-product",
    name: "Test Product",
    description: "A test product.",
    url: "https://example.com/product",
    image: { url: "https://example.com/product.png", alt: "Test product image" },
    ...overrides,
  };
}

test("validatePages: a known-valid, unique set of pages produces no issues", () => {
  const result = validatePages([
    makePage({ id: "a", path: "/a.html", title: "Page A", description: "First page." }),
    makePage({ id: "b", path: "/b.html", title: "Page B", description: "Second page." }),
  ]);
  assert.deepEqual(result.issues, []);
});

test("validatePages: duplicate ids are detected", () => {
  const result = validatePages([makePage({ id: "dup", path: "/a.html" }), makePage({ id: "dup", path: "/b.html", title: "Other" })]);
  assert.ok(findIssue(result.issues, "PAGE_DUPLICATE_ID"));
});

test("validatePages: duplicate paths are detected", () => {
  const result = validatePages([makePage({ id: "a", path: "/same.html" }), makePage({ id: "b", path: "/same.html", title: "Other" })]);
  assert.ok(findIssue(result.issues, "PAGE_DUPLICATE_PATH"));
});

test("validatePages: a missing description is flagged as a warning, not an error", () => {
  const result = validatePages([makePage({ description: undefined })]);
  const found = findIssue(result.issues, "PAGE_MISSING_DESCRIPTION");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});

test("validateProducts: a known-valid, unique set of products produces no issues", () => {
  const result = validateProducts([
    makeProduct({ id: "a", name: "Product A", url: "https://a.example.com" }),
    makeProduct({ id: "b", name: "Product B", url: "https://b.example.com" }),
  ]);
  assert.deepEqual(result.issues, []);
});

test("validateProducts: duplicate ids are detected", () => {
  const result = validateProducts([makeProduct({ id: "dup" }), makeProduct({ id: "dup", url: "https://other.example.com" })]);
  assert.ok(findIssue(result.issues, "PRODUCT_DUPLICATE_ID"));
});

test("validateRelationships: a broken relatedServices reference is detected (error severity)", () => {
  const result = validateRelationships({
    products: [makeProduct({ id: "p1", relatedServices: ["does-not-exist"] })],
    services: [],
  });
  const found = findIssue(result.issues, "PRODUCT_RELATED_SERVICE_UNRESOLVED");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateRelationships: a resolvable relatedServices reference produces no unresolved-reference issue", () => {
  const service: SEOService = { id: "s1", name: "Service One", description: "A service." };
  const result = validateRelationships({
    products: [makeProduct({ id: "p1", relatedServices: ["s1"] })],
    services: [service],
  });
  assert.equal(findIssue(result.issues, "PRODUCT_RELATED_SERVICE_UNRESOLVED"), undefined);
});

test("validateRelationships: a category parentCategory cycle is detected", () => {
  const result = validateRelationships({
    blogCategories: [
      { id: "a", name: "A", parentCategory: "b" },
      { id: "b", name: "B", parentCategory: "a" },
    ],
  });
  assert.ok(findIssue(result.issues, "CATEGORY_CYCLE"));
});

test("validateCommercial: an entity missing all seven commercial fields is flagged for each field", () => {
  const result = validateCommercial({ pages: [{ id: "bare" }] });
  for (const field of ["primaryKeyword", "secondaryKeywords", "searchIntent", "audience", "businessObjective", "commercialPriority", "primaryCta"]) {
    const found = result.issues.find((i) => i.location === `page.${field}`);
    assert.ok(found, `expected a COMMERCIAL_FIELD_MISSING issue for ${field}`);
  }
});

test("validateCommercial: an entity with all seven commercial fields populated produces no issues for it", () => {
  const complete = {
    id: "complete",
    primaryKeyword: "kw",
    secondaryKeywords: ["kw2"],
    searchIntent: "commercial" as const,
    audience: ["Everyone"],
    businessObjective: "Grow revenue",
    commercialPriority: "high" as const,
    primaryCta: { label: "Go", path: "/go" },
  };
  const result = validateCommercial({ pages: [complete], products: [], services: [], solutions: [] });
  assert.deepEqual(result.issues, []);
});

test("validateKnowledgeGraph: duplicate entity ids are detected", () => {
  const entities: KnowledgeGraphEntity[] = [
    { id: "dup", type: "Product", refId: "p1", name: "P1" },
    { id: "dup", type: "Product", refId: "p2", name: "P2" },
  ];
  const result = validateKnowledgeGraph({ entities, relationships: [] });
  assert.ok(findIssue(result.issues, "KG_DUPLICATE_ENTITY_ID"));
});

test("validateKnowledgeGraph: an unresolved relationship endpoint is detected", () => {
  const entities: KnowledgeGraphEntity[] = [{ id: "kg-a", type: "Product", refId: "a", name: "A" }];
  const relationships: KnowledgeGraphRelationship[] = [{ from: "kg-a", to: "kg-missing", type: "relatedTo" }];
  const result = validateKnowledgeGraph({ entities, relationships });
  assert.ok(findIssue(result.issues, "KG_RELATIONSHIP_TO_UNRESOLVED"));
});

test("validateKnowledgeGraph: an entity with no relationship touching it is reported as an orphan", () => {
  const entities: KnowledgeGraphEntity[] = [{ id: "kg-lonely", type: "Product", refId: "lonely", name: "Lonely" }];
  const result = validateKnowledgeGraph({ entities, relationships: [] });
  assert.ok(findIssue(result.issues, "KG_ORPHAN_ENTITY"));
});

test("validateConfiguration: an id shared across two collections is flagged as a collision", () => {
  const result = validateConfiguration([
    { name: "PAGES", ids: ["shared-id", "unique-page"] },
    { name: "SERVICES", ids: ["shared-id", "unique-service"] },
  ]);
  const found = findIssue(result.issues, "CONFIG_CROSS_COLLECTION_ID_COLLISION");
  assert.ok(found);
  assert.match(found!.message, /shared-id/);
});

test("validateConfiguration: no collision is reported when ids don't overlap", () => {
  const result = validateConfiguration([
    { name: "PAGES", ids: ["a"] },
    { name: "SERVICES", ids: ["b"] },
  ]);
  assert.equal(findIssue(result.issues, "CONFIG_CROSS_COLLECTION_ID_COLLISION"), undefined);
});

import { PRODUCTS } from "../config";
import type { SEOProduct } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates SEOProduct-intrinsic structure: identity uniqueness (id/url/
// name) and completeness of fields that are optional in the type but
// expected in practice (url, image). Whether relatedServices/
// relatedSolutions actually resolve is validateRelationships.ts's job, not
// this file's — kept separate so reference-resolution logic lives once.

export function validateProducts(products: readonly SEOProduct[] = PRODUCTS): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(products, (p) => p.id)) {
    issues.push(issue("error", "PRODUCT_DUPLICATE_ID", `${group.length} products share id "${id}"`, id));
  }
  for (const [url, group] of findDuplicates(products, (p) => p.url)) {
    issues.push(issue("error", "PRODUCT_DUPLICATE_URL", `${group.length} products share url "${url}"`, group.map((p) => p.id).join(", ")));
  }
  for (const [name, group] of findDuplicates(products, (p) => p.name)) {
    issues.push(issue("warning", "PRODUCT_DUPLICATE_NAME", `${group.length} products share the name "${name}"`, group.map((p) => p.id).join(", ")));
  }

  for (const product of products) {
    if (isMissing(product.url)) {
      issues.push(issue("warning", "PRODUCT_MISSING_URL", `Product "${product.id}" has no url`, product.id));
    }
    if (isMissing(product.image)) {
      issues.push(issue("warning", "PRODUCT_MISSING_IMAGE", `Product "${product.id}" has no image`, product.id));
    }
  }

  return makeResult("validateProducts", issues);
}

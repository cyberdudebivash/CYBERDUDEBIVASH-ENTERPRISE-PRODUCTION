import { PAGES, PRODUCTS, SERVICES, SOLUTIONS } from "../config";
import type { SEOCommercialFields } from "../types";
import { issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// The commercial-completeness validator required by Phase 1.0.5: every
// page (and, for a fuller picture, every product/service/solution) should
// define all seven commercial fields — Intent, Audience, Business
// Objective, Commercial Priority, Primary CTA, Primary Keyword, Secondary
// Keywords. Reports coverage per field rather than per entity, so the
// headline finding ("X/17 pages missing Y") is visible without wading
// through dozens of individual issues.

type CommercialEntity = { id: string } & SEOCommercialFields;

const COMMERCIAL_FIELDS: ReadonlyArray<{ key: keyof SEOCommercialFields; label: string }> = [
  { key: "primaryKeyword", label: "Primary Keyword" },
  { key: "secondaryKeywords", label: "Secondary Keywords" },
  { key: "searchIntent", label: "Intent" },
  { key: "audience", label: "Audience" },
  { key: "businessObjective", label: "Business Objective" },
  { key: "commercialPriority", label: "Commercial Priority" },
  { key: "primaryCta", label: "Primary CTA" },
];

function checkCoverage(entityKind: string, entities: readonly CommercialEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of COMMERCIAL_FIELDS) {
    const missing = entities.filter((e) => isMissing(e[field.key]));
    if (missing.length === 0) continue;
    issues.push(
      issue(
        "warning",
        "COMMERCIAL_FIELD_MISSING",
        `${missing.length}/${entities.length} ${entityKind} entries are missing "${field.label}" (${field.key}): ${missing.map((e) => e.id).join(", ")}`,
        `${entityKind}.${field.key}`,
      ),
    );
  }
  return issues;
}

export interface CommercialInput {
  pages?: readonly CommercialEntity[];
  products?: readonly CommercialEntity[];
  services?: readonly CommercialEntity[];
  solutions?: readonly CommercialEntity[];
}

export function validateCommercial(input: CommercialInput = {}): ValidationResult {
  const pages = input.pages ?? PAGES;
  const products = input.products ?? PRODUCTS;
  const services = input.services ?? SERVICES;
  const solutions = input.solutions ?? SOLUTIONS;

  const issues: ValidationIssue[] = [
    ...checkCoverage("page", pages),
    ...checkCoverage("product", products),
    ...checkCoverage("service", services),
    ...checkCoverage("solution", solutions),
  ];

  return makeResult("validateCommercial", issues);
}

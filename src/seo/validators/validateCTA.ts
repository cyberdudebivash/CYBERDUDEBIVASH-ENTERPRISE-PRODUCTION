import { PAGES, PRODUCTS, SERVICES, SOLUTIONS } from "../config";
import type { SEOCallToAction, SEOPage } from "../types";
import { issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// Validates primaryCta/secondaryCta across every entity type that carries
// SEOCommercialFields: missing primaryCta, and CTA targets that are
// structurally malformed (no recognizable scheme) or point at a relative
// page path that doesn't exist in the page registry.

type HasCta = { id: string; primaryCta?: SEOCallToAction; secondaryCta?: SEOCallToAction };

const VALID_PATH_PATTERN = /^(\/|https?:\/\/|mailto:|#)/;

function checkCtas(entityKind: string, entities: readonly HasCta[], pagePaths: ReadonlySet<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const missingPrimary = entities.filter((e) => !e.primaryCta);
  if (missingPrimary.length > 0) {
    issues.push(
      issue("warning", "CTA_MISSING_PRIMARY", `${missingPrimary.length}/${entities.length} ${entityKind} entries have no primaryCta: ${missingPrimary.map((e) => e.id).join(", ")}`, entityKind),
    );
  }
  for (const entity of entities) {
    const ctaFields = [
      ["primaryCta", entity.primaryCta] as const,
      ["secondaryCta", entity.secondaryCta] as const,
    ];
    for (const [ctaField, cta] of ctaFields) {
      if (!cta) continue;
      if (!VALID_PATH_PATTERN.test(cta.path)) {
        issues.push(
          issue(
            "error",
            "CTA_MALFORMED_PATH",
            `${entityKind} "${entity.id}" ${ctaField}.path "${cta.path}" has no recognizable scheme (expected "/", "http(s)://", "mailto:", or "#")`,
            entity.id,
          ),
        );
      } else if (cta.path.startsWith("/") && !pagePaths.has(cta.path)) {
        issues.push(issue("error", "CTA_TARGET_PAGE_UNRESOLVED", `${entityKind} "${entity.id}" ${ctaField}.path "${cta.path}" does not match any known page path`, entity.id));
      }
    }
  }
  return issues;
}

export function validateCTA(pages: readonly SEOPage[] = PAGES): ValidationResult {
  const pagePaths = new Set(pages.map((p) => p.path));
  const issues: ValidationIssue[] = [
    ...checkCtas("page", pages, pagePaths),
    ...checkCtas("product", PRODUCTS, pagePaths),
    ...checkCtas("service", SERVICES, pagePaths),
    ...checkCtas("solution", SOLUTIONS, pagePaths),
  ];
  return makeResult("validateCTA", issues);
}

import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, BLOG_ARTICLES, RESEARCH_ARTICLES } from "../config";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates keyword targeting across every entity type that carries
// SEOCommercialFields: missing primaryKeyword/secondaryKeywords, duplicate
// secondary keywords within one entity's own list, and — the classic SEO
// concern — "keyword cannibalization": two different entities targeting
// the exact same primaryKeyword, which makes them compete against each
// other in search results instead of each owning distinct intent.

interface KeywordEntity {
  entityId: string;
  entityKind: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
}

function toKeywordEntities(): KeywordEntity[] {
  return [
    ...PAGES.map((p) => ({ entityId: p.id, entityKind: "page", primaryKeyword: p.primaryKeyword, secondaryKeywords: p.secondaryKeywords })),
    ...PRODUCTS.map((p) => ({ entityId: p.id, entityKind: "product", primaryKeyword: p.primaryKeyword, secondaryKeywords: p.secondaryKeywords })),
    ...SERVICES.map((s) => ({ entityId: s.id, entityKind: "service", primaryKeyword: s.primaryKeyword, secondaryKeywords: s.secondaryKeywords })),
    ...SOLUTIONS.map((s) => ({ entityId: s.id, entityKind: "solution", primaryKeyword: s.primaryKeyword, secondaryKeywords: s.secondaryKeywords })),
    ...BLOG_ARTICLES.map((a) => ({ entityId: a.id, entityKind: "article", primaryKeyword: a.primaryKeyword, secondaryKeywords: a.secondaryKeywords })),
    ...RESEARCH_ARTICLES.map((a) => ({ entityId: a.id, entityKind: "article", primaryKeyword: a.primaryKeyword, secondaryKeywords: a.secondaryKeywords })),
  ];
}

export interface KeywordsInput {
  entities?: readonly KeywordEntity[];
}

export function validateKeywords(input: KeywordsInput = {}): ValidationResult {
  const entities = input.entities ?? toKeywordEntities();
  const issues: ValidationIssue[] = [];

  for (const [keyword, group] of findDuplicates(entities, (e) => e.primaryKeyword)) {
    issues.push(
      issue(
        "warning",
        "KEYWORD_CANNIBALIZATION",
        `${group.length} entities target the same primaryKeyword "${keyword}": ${group.map((e) => `${e.entityKind}:${e.entityId}`).join(", ")}`,
        group.map((e) => e.entityId).join(", "),
      ),
    );
  }

  for (const entity of entities) {
    if (isMissing(entity.primaryKeyword)) {
      issues.push(issue("warning", "KEYWORD_MISSING_PRIMARY", `${entity.entityKind} "${entity.entityId}" has no primaryKeyword`, entity.entityId));
    }
    const secondary = entity.secondaryKeywords;
    if (!secondary || secondary.length === 0) {
      issues.push(issue("warning", "KEYWORD_MISSING_SECONDARY", `${entity.entityKind} "${entity.entityId}" has no secondaryKeywords`, entity.entityId));
    } else {
      for (const [keyword, group] of findDuplicates(
        secondary.map((k) => ({ k })),
        (x) => x.k,
      )) {
        issues.push(
          issue(
            "warning",
            "KEYWORD_DUPLICATE_SECONDARY_WITHIN_ENTITY",
            `${entity.entityKind} "${entity.entityId}" lists secondary keyword "${keyword}" ${group.length} times`,
            entity.entityId,
          ),
        );
      }
    }
  }

  return makeResult("validateKeywords", issues);
}

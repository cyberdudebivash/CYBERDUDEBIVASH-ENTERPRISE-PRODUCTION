import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, AUTHORS, BLOG_ARTICLES, RESEARCH_ARTICLES } from "../config";
import type { SEOImage, SEOPage } from "../types";
import { issue, makeResult, findDuplicates, type ValidationIssue, type ValidationResult } from "./shared";

// Validates every image slot in the model — the always-required
// OpenGraph/Twitter images on SEOPage, and the optional `image` field
// shared by SEOProduct/SEOService/SEOSolution/SEOAuthor/SEOArticle. Owns
// every alt-text check too (moved out of validatePages.ts so image logic
// lives in exactly one file).

interface HasOptionalImage {
  id: string;
  image?: SEOImage;
}

function checkOptionalImages(entityKind: string, entities: readonly HasOptionalImage[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const missing = entities.filter((e) => !e.image);
  if (missing.length > 0) {
    issues.push(
      issue("warning", "IMAGE_MISSING", `${missing.length}/${entities.length} ${entityKind} entries have no image: ${missing.map((e) => e.id).join(", ")}`, entityKind),
    );
  }
  for (const entity of entities) {
    if (entity.image && entity.image.alt.trim().length === 0) {
      issues.push(issue("error", "IMAGE_BLANK_ALT", `${entityKind} "${entity.id}" has an image with blank alt text`, entity.id));
    }
  }
  return issues;
}

export function validateImages(pages: readonly SEOPage[] = PAGES): ValidationResult {
  const issues: ValidationIssue[] = [
    ...checkOptionalImages("product", PRODUCTS),
    ...checkOptionalImages("service", SERVICES),
    ...checkOptionalImages("solution", SOLUTIONS),
    ...checkOptionalImages("author", AUTHORS),
    ...checkOptionalImages("article", [...BLOG_ARTICLES, ...RESEARCH_ARTICLES]),
  ];

  for (const page of pages) {
    if (page.openGraph.image.alt.trim().length === 0) {
      issues.push(issue("error", "IMAGE_BLANK_ALT", `Page "${page.id}" OpenGraph image has blank alt text`, page.id));
    }
    if (page.twitterCard.image && page.twitterCard.image.alt.trim().length === 0) {
      issues.push(issue("error", "IMAGE_BLANK_ALT", `Page "${page.id}" Twitter card image has blank alt text`, page.id));
    }
  }

  const ogImageGroups = [...findDuplicates(pages, (p) => p.openGraph.image.url).entries()].sort((a, b) => b[1].length - a[1].length);
  const largest = ogImageGroups[0];
  if (largest) {
    const [sharedUrl, group] = largest;
    if (group.length === pages.length) {
      issues.push(
        issue("info", "IMAGE_ALL_PAGES_SHARE_DEFAULT", `All ${pages.length} pages share one identical OpenGraph image ("${sharedUrl}") — none has a page-specific image yet`, "PAGES"),
      );
    } else {
      issues.push(issue("info", "IMAGE_PAGES_SHARE_DEFAULT", `${group.length}/${pages.length} pages share one identical OpenGraph image ("${sharedUrl}")`, "PAGES"));
    }
  }

  return makeResult("validateImages", issues);
}

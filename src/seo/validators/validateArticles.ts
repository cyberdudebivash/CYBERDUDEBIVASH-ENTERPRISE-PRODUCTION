import { BLOG_ARTICLES, RESEARCH_ARTICLES } from "../config";
import type { SEOArticle } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates every SEOArticle in the model — blog.config.ts's 3 real posts
// plus research.config.ts's (currently empty) array — as one combined
// namespace, since both are the same SEOArticle shape and article ids must
// be unique across the whole model, not just within one file. Whether
// authorId/categoryIds resolve is validateRelationships.ts's job.

export function validateArticles(articles: readonly SEOArticle[] = [...BLOG_ARTICLES, ...RESEARCH_ARTICLES]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(articles, (a) => a.id)) {
    issues.push(issue("error", "ARTICLE_DUPLICATE_ID", `${group.length} articles share id "${id}"`, id));
  }
  for (const [url, group] of findDuplicates(articles, (a) => a.url)) {
    issues.push(issue("error", "ARTICLE_DUPLICATE_URL", `${group.length} articles share url "${url}"`, group.map((a) => a.id).join(", ")));
  }
  for (const [title, group] of findDuplicates(articles, (a) => a.title)) {
    issues.push(issue("warning", "ARTICLE_DUPLICATE_TITLE", `${group.length} articles share the title "${title}"`, group.map((a) => a.id).join(", ")));
  }
  for (const [description, group] of findDuplicates(articles, (a) => a.description)) {
    issues.push(
      issue("warning", "ARTICLE_DUPLICATE_DESCRIPTION", `${group.length} articles share one description: "${description}"`, group.map((a) => a.id).join(", ")),
    );
  }

  for (const article of articles) {
    if (isMissing(article.image)) {
      issues.push(issue("warning", "ARTICLE_MISSING_IMAGE", `Article "${article.id}" has no image`, article.id));
    }
  }

  return makeResult("validateArticles", issues);
}

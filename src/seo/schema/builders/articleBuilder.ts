import type { SEOArticle } from "../../types/entities";
import { getAuthorById } from "../../utils/lookup";
import { normalizeUrl, normalizeKeywordList, buildKeywords } from "../../metadata";
import { buildId, toImageObject } from "../normalizers";
import { personId } from "./personBuilder";
import { organizationId } from "./organizationBuilder";
import type { ArticleSchemaNode } from "../types/nodes";

// ArticleBuilder — one node per SEOArticle (blog.config.ts's 3 real
// posts). `author` references a Person node by @id, resolved via the
// existing getAuthorById lookup (utils/lookup.ts, Phase 1.0, reused
// rather than re-implemented) — matching Phase 1.0's own
// ArticleSchema.author comment: "References an SEOAuthor.id." This is
// that resolution. Throws on an unresolved authorId rather than
// silently substituting a placeholder Person — "validation failures
// must be explicit, never silently recover" — though Phase 1.0.5's own
// validateSchema.ts already confirms all 3 real articles resolve
// cleanly, so this path is defensive, not a real-data expectation.

export function articleId(article: SEOArticle): string {
  return buildId(article.url, "article");
}

export function buildArticle(article: SEOArticle): ArticleSchemaNode {
  const author = getAuthorById(article.authorId);
  if (!author) {
    throw new Error(`buildArticle: article "${article.id}" references unknown authorId "${article.authorId}"`);
  }
  return {
    "@type": "Article",
    "@id": articleId(article),
    headline: article.title,
    description: article.description,
    url: normalizeUrl(article.url),
    author: { "@id": personId(author) },
    publisher: { "@id": organizationId() },
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate,
    image: article.image ? toImageObject(article.image) : undefined,
    keywords: normalizeKeywordList([...buildKeywords(article), ...(article.keywords ?? [])]),
  };
}

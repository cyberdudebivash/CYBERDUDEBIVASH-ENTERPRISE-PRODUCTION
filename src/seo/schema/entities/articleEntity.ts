import { BLOG_ARTICLES } from "../../config";
import { buildArticle } from "../builders/articleBuilder";
import type { ArticleSchemaNode } from "../types/nodes";

export function resolveArticleSchema(id: string): ArticleSchemaNode | undefined {
  const article = BLOG_ARTICLES.find((a) => a.id === id);
  return article ? buildArticle(article) : undefined;
}

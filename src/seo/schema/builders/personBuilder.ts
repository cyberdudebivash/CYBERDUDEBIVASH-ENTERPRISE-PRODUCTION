import type { SEOAuthor } from "../../types/entities";
import { SITE_CONFIG } from "../../config/site.config";
import { buildId, toImageObject } from "../normalizers";
import type { PersonSchemaNode } from "../types/nodes";

// PersonBuilder — builds a Person node for any SEOAuthor. Used
// internally by ArticleBuilder (Article.author); not registered as its
// own page-level producer since no page is "about" a specific author
// today.

export function personId(author: SEOAuthor): string {
  return buildId(author.url ?? SITE_CONFIG.domain, `person-${author.id}`);
}

export function buildPerson(author: SEOAuthor): PersonSchemaNode {
  return {
    "@type": "Person",
    "@id": personId(author),
    name: author.name,
    url: author.url,
    jobTitle: author.role,
    description: author.bio,
    image: author.image ? toImageObject(author.image) : undefined,
    sameAs: author.sameAs ? [...author.sameAs] : undefined,
  };
}

import type { SEORuntimeResult } from "../contracts/types";

// headTags — the one place a SEORuntimeResult is reshaped into an
// ordered list of document-head tag descriptors. Every adapter
// (staticHtmlAdapter, ssrAdapter, reactAdapter) builds on this instead
// of re-deriving its own tag list from `result.metadata`/`result.schemas`
// — "transformation only, no business logic" (the Runtime Contract's own
// Adapters rule) means an adapter may only decide HOW to serialize a
// tag, never WHICH tags exist or what they contain; that decision is
// made exactly once, here.

export type HeadTag =
  | { kind: "title"; content: string }
  | { kind: "meta"; name?: string; property?: string; content: string }
  | { kind: "link"; rel: string; href: string; hreflang?: string }
  | { kind: "jsonLd"; data: unknown };

export function buildHeadTags(result: SEORuntimeResult): HeadTag[] {
  const { metadata, schemas } = result;
  const tags: HeadTag[] = [];

  tags.push({ kind: "title", content: metadata.title });
  tags.push({ kind: "meta", name: "description", content: metadata.description });
  tags.push({ kind: "meta", name: "robots", content: metadata.robots });
  tags.push({ kind: "meta", name: "author", content: metadata.author });
  tags.push({ kind: "meta", name: "application-name", content: metadata.application });
  tags.push({ kind: "meta", name: "theme-color", content: metadata.theme });

  if (metadata.keywords.length > 0) {
    tags.push({ kind: "meta", name: "keywords", content: metadata.keywords.join(", ") });
  }

  tags.push({ kind: "link", rel: "canonical", href: metadata.canonical });
  for (const alternate of metadata.alternates) {
    tags.push({ kind: "link", rel: "alternate", href: alternate.href, hreflang: alternate.hreflang });
  }

  for (const tag of metadata.verification) {
    tags.push({ kind: "meta", name: tag.name, content: tag.content });
  }

  const og = metadata.openGraph;
  tags.push({ kind: "meta", property: "og:title", content: og.title });
  tags.push({ kind: "meta", property: "og:description", content: og.description });
  tags.push({ kind: "meta", property: "og:type", content: og.type });
  tags.push({ kind: "meta", property: "og:url", content: og.url });
  tags.push({ kind: "meta", property: "og:image", content: og.image.url });
  if (og.siteName) tags.push({ kind: "meta", property: "og:site_name", content: og.siteName });
  if (og.locale) tags.push({ kind: "meta", property: "og:locale", content: og.locale });

  const twitter = metadata.twitter;
  tags.push({ kind: "meta", name: "twitter:card", content: twitter.card });
  if (twitter.site) tags.push({ kind: "meta", name: "twitter:site", content: twitter.site });
  if (twitter.creator) tags.push({ kind: "meta", name: "twitter:creator", content: twitter.creator });
  tags.push({ kind: "meta", name: "twitter:title", content: twitter.title });
  tags.push({ kind: "meta", name: "twitter:description", content: twitter.description });
  tags.push({ kind: "meta", name: "twitter:image", content: twitter.image.url });

  tags.push({ kind: "jsonLd", data: schemas });

  return tags;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Serializes one HeadTag to its literal HTML string — the one place StaticHtmlAdapter and SSRAdapter share their (identical) escaping/markup rules, so neither reimplements it. ReactAdapter does not use this: JSX/React already owns escaping for its own props. */
export function serializeHeadTag(tag: HeadTag): string {
  switch (tag.kind) {
    case "title":
      return `<title>${escapeHtml(tag.content)}</title>`;
    case "meta": {
      const attr = tag.name ? `name="${escapeHtml(tag.name)}"` : `property="${escapeHtml(tag.property!)}"`;
      return `<meta ${attr} content="${escapeHtml(tag.content)}">`;
    }
    case "link": {
      const hreflang = tag.hreflang ? ` hreflang="${escapeHtml(tag.hreflang)}"` : "";
      return `<link rel="${escapeHtml(tag.rel)}" href="${escapeHtml(tag.href)}"${hreflang}>`;
    }
    case "jsonLd":
      // `</` -> `<\/` so a "</script>" substring inside any generated
      // string value (e.g. a description) can never prematurely close
      // this script element — standard practice for embedding JSON
      // inside <script>, applied here even though today's data is
      // config-authored, not user input.
      return `<script type="application/ld+json">${JSON.stringify(tag.data).replace(/<\//g, "<\\/")}</script>`;
  }
}

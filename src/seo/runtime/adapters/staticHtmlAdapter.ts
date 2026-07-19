import type { SEORuntimeResult } from "../contracts/types";

// staticHtmlAdapter — transformation only, per this phase's own
// instruction: reads an already-computed SEORuntimeResult and reshapes
// it into plain, framework-agnostic head-tag data. No business logic:
// nothing here decides WHAT a page's title/description/schema is
// (that was already decided by the Metadata Engine and Schema
// Platform); this only decides HOW to represent that decision as
// meta/link tags and a JSON-LD payload.

export interface StaticMetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface StaticLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
}

export interface StaticHtmlHead {
  title: string;
  metaTags: StaticMetaTag[];
  linkTags: StaticLinkTag[];
  /** The composed page schema set, pre-serialized as the exact string a `<script type="application/ld+json">` tag's body would contain. */
  jsonLd: string;
}

function metaTagsFor(result: SEORuntimeResult): StaticMetaTag[] {
  const { metadata } = result;
  const tags: StaticMetaTag[] = [
    { name: "description", content: metadata.description },
    { name: "robots", content: metadata.robots },
    { name: "keywords", content: metadata.keywords.join(", ") },
    { name: "author", content: metadata.author },
    { property: "og:title", content: metadata.openGraph.title },
    { property: "og:description", content: metadata.openGraph.description },
    { property: "og:type", content: metadata.openGraph.type },
    { property: "og:url", content: metadata.openGraph.url },
    { property: "og:image", content: metadata.openGraph.image.url },
    { name: "twitter:card", content: metadata.twitter.card },
    { name: "twitter:title", content: metadata.twitter.title },
    { name: "twitter:description", content: metadata.twitter.description },
    { name: "twitter:image", content: metadata.twitter.image.url },
  ];
  for (const tag of metadata.verification) {
    tags.push({ name: tag.name, content: tag.content });
  }
  return tags;
}

function linkTagsFor(result: SEORuntimeResult): StaticLinkTag[] {
  const { metadata } = result;
  const tags: StaticLinkTag[] = [{ rel: "canonical", href: metadata.canonical }];
  for (const alt of metadata.alternates) {
    tags.push({ rel: "alternate", href: alt.href, hreflang: alt.hreflang });
  }
  return tags;
}

export function toStaticHtmlHead(result: SEORuntimeResult): StaticHtmlHead {
  return {
    title: result.metadata.title,
    metaTags: metaTagsFor(result),
    linkTags: linkTagsFor(result),
    jsonLd: JSON.stringify(result.schemas),
  };
}

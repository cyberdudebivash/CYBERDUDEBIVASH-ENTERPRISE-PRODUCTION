import { toStaticHtmlHead } from "../../runtime";
import type { SEORuntimeResult } from "../../runtime";
import type { PageArtifactSet, PageMetadataArtifact, JsonLdArtifact, BreadcrumbItem } from "./types";

// pageArtifacts — the Build Platform's per-page artifact builder.
// Consumes ONLY a Runtime API result (SEORuntimeResult, and the
// Runtime's own toStaticHtmlHead() adapter for meta/link tag
// shaping); never touches Metadata/Schema/Relationship/Commercial/
// Validation engines directly, and never re-derives anything the
// Runtime already computed.

function breadcrumbFrom(result: SEORuntimeResult): BreadcrumbItem[] {
  const node = result.schemas["@graph"].find((n) => n["@type"] === "BreadcrumbList");
  if (!node) return [];
  return node.itemListElement.map((item) => ({ position: item.position, name: item.name, item: item.item }));
}

export function buildPageMetadataArtifact(pageId: string, result: SEORuntimeResult): PageMetadataArtifact {
  const head = toStaticHtmlHead(result);
  const canonical = head.linkTags.find((tag) => tag.rel === "canonical");
  const alternates = head.linkTags.filter((tag) => tag.rel === "alternate");
  return {
    pageId,
    title: head.title,
    description: result.metadata.description,
    keywords: result.metadata.keywords,
    robots: result.metadata.robots,
    language: result.metadata.language,
    canonical: canonical?.href ?? result.metadata.canonical,
    alternates,
    openGraph: head.metaTags.filter((tag) => tag.property?.startsWith("og:")),
    twitter: head.metaTags.filter((tag) => tag.name?.startsWith("twitter:")),
    breadcrumb: breadcrumbFrom(result),
  };
}

export function buildJsonLdArtifact(pageId: string, result: SEORuntimeResult): JsonLdArtifact {
  return {
    pageId,
    nodeCount: result.schemas["@graph"].length,
    json: JSON.stringify(result.schemas),
  };
}

export function buildPageArtifactSet(pageId: string, result: SEORuntimeResult): PageArtifactSet {
  return {
    pageId,
    metadata: buildPageMetadataArtifact(pageId, result),
    jsonLd: buildJsonLdArtifact(pageId, result),
  };
}

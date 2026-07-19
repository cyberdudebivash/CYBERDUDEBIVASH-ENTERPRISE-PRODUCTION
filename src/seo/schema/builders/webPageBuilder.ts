import type { PageMetadata } from "../../metadata";
import { buildId, toImageObject } from "../normalizers";
import { websiteId } from "./websiteBuilder";
import { organizationId } from "./organizationBuilder";
import type { WebPageSchemaNode, AboutPageSchemaNode, ContactPageSchemaNode } from "../types/nodes";

// WebPageBuilder — consumes PageMetadata (Phase 1.1's generated
// output), not raw SEOPage: title/description/canonical/image/language
// are already resolved, normalized, and validated one layer down, so
// this builder composes them rather than re-deriving them a second
// time — the architecture diagram in documentation/SCHEMA_ENGINE.md
// ("Metadata Engine -> Schema Generation Platform") made concrete.
// AboutPage/ContactPage reuse the same @id as the underlying WebPage
// (one physical page is one logical node; only its @type narrows) —
// registered by the Registry for exactly the two real pages that are
// About/Contact, everything else stays generic WebPage.

export function webPageId(metadata: PageMetadata): string {
  return buildId(metadata.canonical, "webpage");
}

export function buildWebPage(metadata: PageMetadata): WebPageSchemaNode {
  return {
    "@type": "WebPage",
    "@id": webPageId(metadata),
    url: metadata.canonical,
    name: metadata.title,
    description: metadata.description,
    isPartOf: { "@id": websiteId() },
    inLanguage: metadata.language,
    primaryImageOfPage: toImageObject(metadata.openGraph.image),
  };
}

export function buildAboutPage(metadata: PageMetadata): AboutPageSchemaNode {
  return { ...buildWebPage(metadata), "@type": "AboutPage", mainEntity: { "@id": organizationId() } };
}

export function buildContactPage(metadata: PageMetadata): ContactPageSchemaNode {
  return { ...buildWebPage(metadata), "@type": "ContactPage", mainEntity: { "@id": organizationId() } };
}

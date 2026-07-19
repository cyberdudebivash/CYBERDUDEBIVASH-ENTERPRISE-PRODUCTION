import type { JSON_LD_CONTEXT, IdReference, ImageObjectNode, PostalAddressNode, GeoCoordinatesNode, ContactPointNode, OfferNode, SearchActionNode, ListItemNode, QuestionNode, BrandNode } from "./common";

// Owns: every top-level schema.org node this platform can generate.
// None of these variants carry their own "@context" — per real,
// live @graph evidence (item.html, apps.html's god-mode-injected
// blocks), individual entries inside a "@graph" array never repeat
// "@context"; it belongs once, on PageSchemaSet's wrapper. Cross-entity
// references use IdReference ("@id" only) rather than re-embedding the
// full referenced node — the same technique that same live evidence
// uses (WebSite.publisher -> {"@id": "...#organization"}) — so the
// Registry's duplicate-prevention has something to actually de-duplicate
// against instead of repeated full copies.

export interface OrganizationSchemaNode {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: ImageObjectNode;
  sameAs: string[];
  contactPoint: ContactPointNode[];
  /** Name-only, matching SEOOrganization.founder's own minimal shape (organization.ts) — not a full Person reference, since organization.config.ts models it as just a name, with no id/url/bio to resolve against. */
  founder?: { "@type": "Person"; name: string };
}

export interface WebSiteSchemaNode {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  description: string;
  publisher: IdReference;
  /** Never populated by WebsiteBuilder's default output — see SearchActionNode's own header comment. */
  potentialAction?: SearchActionNode;
}

export interface WebPageSchemaNode {
  "@type": "WebPage";
  "@id": string;
  url: string;
  name: string;
  description: string;
  isPartOf: IdReference;
  inLanguage: string;
  primaryImageOfPage?: ImageObjectNode;
}

export interface AboutPageSchemaNode extends Omit<WebPageSchemaNode, "@type"> {
  "@type": "AboutPage";
  mainEntity: IdReference;
}

export interface ContactPageSchemaNode extends Omit<WebPageSchemaNode, "@type"> {
  "@type": "ContactPage";
  mainEntity: IdReference;
}

export interface PersonSchemaNode {
  "@type": "Person";
  "@id": string;
  name: string;
  url?: string;
  jobTitle?: string;
  description?: string;
  image?: ImageObjectNode;
  sameAs?: string[];
}

export interface ArticleSchemaNode {
  "@type": "Article";
  "@id": string;
  headline: string;
  description: string;
  url: string;
  author: IdReference;
  publisher: IdReference;
  datePublished?: string;
  dateModified?: string;
  image?: ImageObjectNode;
  keywords?: string[];
}

export interface ServiceSchemaNode {
  "@type": "Service";
  "@id": string;
  name: string;
  description: string;
  url?: string;
  provider: IdReference;
  areaServed?: string;
}

/** Used for SOLUTIONS (the priced, purchasable Gumroad kits) — see documentation/SCHEMA_MAPPING_MATRIX.md for why PRODUCTS map to SoftwareApplication instead. */
export interface ProductSchemaNode {
  "@type": "Product";
  "@id": string;
  name: string;
  description: string;
  url: string;
  image?: ImageObjectNode;
  brand: BrandNode;
  offers?: OfferNode;
}

export interface SoftwareApplicationSchemaNode {
  "@type": "SoftwareApplication";
  "@id": string;
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem?: string;
  provider: IdReference;
}

export interface LocalBusinessSchemaNode {
  "@type": "LocalBusiness";
  "@id": string;
  name: string;
  url: string;
  address: PostalAddressNode;
  geo?: GeoCoordinatesNode;
  telephone: string;
  image?: ImageObjectNode;
}

export interface BreadcrumbListSchemaNode {
  "@type": "BreadcrumbList";
  "@id": string;
  itemListElement: ListItemNode[];
}

/** Modeled and unit-tested; no real producer wired to it — no FAQ config data exists yet even though FAQPage schema is genuinely live on 5 real pages (compliance.html and others). See documentation/SCHEMA_ENGINE.md's Known Risks. */
export interface FAQPageSchemaNode {
  "@type": "FAQPage";
  "@id": string;
  mainEntity: QuestionNode[];
}

export type SchemaNode =
  | OrganizationSchemaNode
  | WebSiteSchemaNode
  | WebPageSchemaNode
  | AboutPageSchemaNode
  | ContactPageSchemaNode
  | PersonSchemaNode
  | ArticleSchemaNode
  | ServiceSchemaNode
  | ProductSchemaNode
  | SoftwareApplicationSchemaNode
  | LocalBusinessSchemaNode
  | BreadcrumbListSchemaNode
  | FAQPageSchemaNode;

/** One page's composed, de-duplicated set of schema nodes — what a single `<script type="application/ld+json">` should contain, if a future phase ever emits one. This phase only generates the object; see SchemaRegistry.composePageSchemaSet. */
export interface PageSchemaSet {
  "@context": typeof JSON_LD_CONTEXT;
  "@graph": SchemaNode[];
}

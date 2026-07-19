// Owns: the structured-data (JSON-LD) shape for every schema.org type
// already found live in the 17 static pages (see SEO_ARCHITECTURE.md's
// evidence inventory and SEO_MIGRATION_PLAN.md's schema classification)
// — Organization x40, WebSite x3, BreadcrumbList x12, FAQPage x5,
// Service x16, Product x1, SoftwareApplication x2, LocalBusiness x2,
// AboutPage x1, ContactPage x1, plus Article for blog.config.ts. This
// only represents the shape; nothing here emits actual <script> tags —
// that's Phase 1.2, explicitly out of scope for Phase 1.0.
//
// Deeper nested types found in the audit (ListItem, Question/Answer,
// Offer, PostalAddress, ContactPoint, GeoCoordinates, etc.) are
// embedded fields on the variants below, not separate top-level graph
// nodes, matching how they actually appear in the existing markup.

export interface OrganizationSchema {
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

export interface WebSiteSchema {
  "@type": "WebSite";
  name: string;
  url: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

export interface BreadcrumbListSchema {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export interface FAQPageSchema {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export interface ServiceSchema {
  "@type": "Service";
  name: string;
  description: string;
  /** References an SEOOrganization.id, resolved by a future generator. */
  provider: string;
  areaServed?: string;
}

export interface ProductSchema {
  "@type": "Product";
  name: string;
  description: string;
  offers?: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
  };
}

export interface SoftwareApplicationSchema {
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem?: string;
}

export interface LocalBusinessSchema {
  "@type": "LocalBusiness";
  name: string;
  /** References an SEOPostalAddress, resolved by a future generator — kept as a string id here to avoid duplicating the address shape already owned by organization.ts. */
  address: string;
  telephone?: string;
}

export interface AboutPageSchema {
  "@type": "AboutPage";
  name: string;
  url: string;
  description: string;
}

export interface ContactPageSchema {
  "@type": "ContactPage";
  name: string;
  url: string;
}

export interface ArticleSchema {
  "@type": "Article";
  headline: string;
  description: string;
  /** References an SEOAuthor.id. */
  author: string;
  datePublished?: string;
  dateModified?: string;
}

export type SchemaDefinition =
  | OrganizationSchema
  | WebSiteSchema
  | BreadcrumbListSchema
  | FAQPageSchema
  | ServiceSchema
  | ProductSchema
  | SoftwareApplicationSchema
  | LocalBusinessSchema
  | AboutPageSchema
  | ContactPageSchema
  | ArticleSchema;

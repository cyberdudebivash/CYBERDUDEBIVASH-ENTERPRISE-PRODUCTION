// Owns: small, reusable JSON-LD fragment shapes shared across multiple
// top-level schema nodes — nothing here is a standalone page/entity
// schema itself (those live in nodes.ts). Named without an "SEO" prefix
// (these are schema.org's own vocabulary) but distinct from Phase 1.0's
// types/schema.ts names (ImageObject/Offer/etc. aren't exported there
// today, so there's no collision — verified before naming these).

export const JSON_LD_CONTEXT = "https://schema.org" as const;

/** A JSON-LD reference to another node already present in the same @graph, by @id — schema.org's own mechanism for "point at this instead of re-embedding it." */
export interface IdReference {
  "@id": string;
}

export interface ImageObjectNode {
  "@type": "ImageObject";
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface PostalAddressNode {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface GeoCoordinatesNode {
  "@type": "GeoCoordinates";
  latitude: number;
  longitude: number;
}

export interface ContactPointNode {
  "@type": "ContactPoint";
  telephone: string;
  email: string;
  contactType: string;
  areaServed?: string;
}

/** Built only from a cleanly-parseable price (see builders/productBuilder.ts) — never a guessed currency or shorthand expansion. */
export interface OfferNode {
  "@type": "Offer";
  price: string;
  priceCurrency: string;
  url?: string;
}

/**
 * Modeled and unit-tested but never wired into a real producer this
 * phase — see documentation/SCHEMA_ENGINE.md's Known Risks. The one
 * live example of this on the real site (item.html) targets
 * `cyberbivash.blogspot.com/search` (a copy-pasted Blogspot template
 * default), not any real search endpoint on this platform, so there is
 * no verified real target to default this to.
 */
export interface SearchActionNode {
  "@type": "SearchAction";
  target: string;
  "query-input": string;
}

/** Embedded inline on ProductSchemaNode.brand rather than referenced by @id — schema.org's Brand isn't a graph-level singleton the way Organization/WebSite are, so there's no separate registered node to point at. */
export interface BrandNode {
  "@type": "Brand";
  name: string;
}

export interface ListItemNode {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

export interface QuestionNode {
  "@type": "Question";
  name: string;
  acceptedAnswer: { "@type": "Answer"; text: string };
}

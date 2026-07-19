import type { SEOImage } from "./common";

// Owns: the legal organization entity and its brand(s). Nothing else
// should redeclare a name/logo/address/contact-point shape — reference
// these instead.

export interface SEOContactPoint {
  telephone: string;
  email: string;
  contactType: "customer service" | "sales" | "technical support" | "legal";
  areaServed?: string;
}

export interface SEOPostalAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface SEOBrand {
  id: string;
  name: string;
  legalName?: string;
  logo: SEOImage;
  url: string;
  description?: string;
}

export interface SEOOrganization {
  id: string;
  name: string;
  legalName: string;
  /** References an SEOBrand.id in organization.config.ts's BRANDS array. */
  brand: string;
  url: string;
  logo: SEOImage;
  foundingDate: string;
  founder: { name: string };
  address: SEOPostalAddress;
  /** Plural because legal/compliance correspondence and public/support inquiries are genuinely different addresses today — see organization.config.ts's evidence comment before assuming these can be merged into one. */
  contactPoints: SEOContactPoint[];
  /** Every external profile/subdomain this entity is "the same as," for JSON-LD sameAs generation in a later phase. */
  sameAs: string[];
  numberOfEmployees?: { minValue: number; maxValue: number };
}

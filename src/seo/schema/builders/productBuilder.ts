import type { SEOSolution } from "../../types/entities";
import { BRANDS, ORGANIZATION } from "../../config/organization.config";
import { normalizeUrl } from "../../metadata";
import { buildId, toImageObject } from "../normalizers";
import type { ProductSchemaNode } from "../types/nodes";
import type { OfferNode, BrandNode } from "../types/common";

// ProductBuilder — one node per SEOSolution, the priced, purchasable
// Gumroad kits (see documentation/SCHEMA_MAPPING_MATRIX.md for why
// PRODUCTS — the live platform/subdomains — map to
// SoftwareApplicationBuilder instead of here). `offers` is only
// populated when `price` cleanly parses as a plain rupee amount (e.g.
// "₹499", "₹1,499") — never guessed from an ambiguous value.

const RUPEE_PRICE = /^₹([\d,]+(?:\.\d+)?)$/;

function buildOffer(solution: SEOSolution): OfferNode | undefined {
  if (!solution.price) return undefined;
  const match = RUPEE_PRICE.exec(solution.price.trim());
  if (!match) return undefined;
  return { "@type": "Offer", price: match[1].replace(/,/g, ""), priceCurrency: "INR", url: normalizeUrl(solution.url ?? ORGANIZATION.url) };
}

function buildBrand(): BrandNode {
  const brand = BRANDS.find((b) => b.id === ORGANIZATION.brand);
  return { "@type": "Brand", name: brand?.name ?? ORGANIZATION.name };
}

function productId(solution: SEOSolution): string {
  return buildId(solution.url ?? ORGANIZATION.url, `product-${solution.id}`);
}

export function buildProduct(solution: SEOSolution): ProductSchemaNode {
  return {
    "@type": "Product",
    "@id": productId(solution),
    name: solution.name,
    description: solution.description,
    url: normalizeUrl(solution.url ?? ORGANIZATION.url),
    image: solution.image ? toImageObject(solution.image) : undefined,
    brand: buildBrand(),
    offers: buildOffer(solution),
  };
}

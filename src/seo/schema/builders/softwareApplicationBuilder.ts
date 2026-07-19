import type { SEOProduct } from "../../types/entities";
import { ORGANIZATION } from "../../config/organization.config";
import { normalizeUrl } from "../../metadata";
import { buildId } from "../normalizers";
import { organizationId } from "./organizationBuilder";
import type { SoftwareApplicationSchemaNode } from "../types/nodes";

// SoftwareApplicationBuilder — one node per SEOProduct (the 5 live
// platform/subdomains: Sentinel APEX, AI Security Hub, ThreatCore
// Tools, the Research Blog, the official gateway). `applicationCategory`
// is a fixed "SecurityApplication" and `operatingSystem` a fixed "Web"
// for every product — real, verified facts (every product resolves to
// a real live web subdomain, and the platform's whole stated identity
// is cybersecurity), not per-product guesses. This is an imperfect fit
// for the "blog" product specifically (an editorial site, not literally
// an installable/interactive application) — flagged, not special-cased,
// in documentation/SCHEMA_ENGINE.md's Known Risks; carving out a
// per-product exception here would itself be the page/entity-specific
// logic this platform is built to avoid.

const APPLICATION_CATEGORY = "SecurityApplication";
const OPERATING_SYSTEM = "Web";

function softwareApplicationId(product: SEOProduct): string {
  return buildId(product.url ?? ORGANIZATION.url, `softwareapplication-${product.id}`);
}

export function buildSoftwareApplication(product: SEOProduct): SoftwareApplicationSchemaNode {
  return {
    "@type": "SoftwareApplication",
    "@id": softwareApplicationId(product),
    name: product.name,
    description: product.description,
    url: normalizeUrl(product.url ?? ORGANIZATION.url),
    applicationCategory: APPLICATION_CATEGORY,
    operatingSystem: OPERATING_SYSTEM,
    provider: { "@id": organizationId() },
  };
}

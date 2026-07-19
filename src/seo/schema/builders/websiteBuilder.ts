import { SITE_CONFIG } from "../../config/site.config";
import { BRANDS, ORGANIZATION } from "../../config/organization.config";
import { buildId } from "../normalizers";
import { organizationId } from "./organizationBuilder";
import type { WebSiteSchemaNode } from "../types/nodes";

// WebsiteBuilder — the platform's one WebSite node. `description`
// resolves to the real brand description already ported into
// organization.config.ts (BRANDS[ORGANIZATION.brand]) rather than new
// marketing copy invented for this schema — see
// documentation/SCHEMA_ENGINE.md's Architecture Decisions. Never sets
// `potentialAction` — see SearchActionNode's header comment
// (types/common.ts) for why that stays opt-in via
// searchActionBuilder.ts instead of a fabricated default here.

export function websiteId(): string {
  return buildId(SITE_CONFIG.domain, "website");
}

export function buildWebsite(): WebSiteSchemaNode {
  const brand = BRANDS.find((b) => b.id === ORGANIZATION.brand);
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    url: SITE_CONFIG.domain,
    name: SITE_CONFIG.siteName,
    description: brand?.description ?? SITE_CONFIG.siteName,
    publisher: { "@id": organizationId() },
  };
}

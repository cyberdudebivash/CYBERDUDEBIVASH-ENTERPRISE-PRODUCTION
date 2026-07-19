import { buildOrganization } from "../builders/organizationBuilder";
import { buildWebsite } from "../builders/websiteBuilder";
import { buildLocalBusiness } from "../builders/localBusinessBuilder";
import type { OrganizationSchemaNode, WebSiteSchemaNode, LocalBusinessSchemaNode } from "../types/nodes";

// organizationEntity — the singleton resolvers. Unlike every other
// file in this directory, Organization/WebSite/LocalBusiness have
// exactly one real instance each, so there's no id to resolve by.

export function resolveOrganizationSchema(): OrganizationSchemaNode {
  return buildOrganization();
}

export function resolveWebsiteSchema(): WebSiteSchemaNode {
  return buildWebsite();
}

export function resolveLocalBusinessSchema(): LocalBusinessSchemaNode {
  return buildLocalBusiness();
}

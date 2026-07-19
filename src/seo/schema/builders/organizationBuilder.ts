import { ORGANIZATION } from "../../config/organization.config";
import type { SEOContactPoint } from "../../types/organization";
import { buildId, toImageObject } from "../normalizers";
import type { OrganizationSchemaNode } from "../types/nodes";
import type { ContactPointNode } from "../types/common";

// OrganizationBuilder — the platform's one Organization node, a
// singleton (not per-page), referenced everywhere else by @id
// (WebSite.publisher, WebPage.mainEntity, Service.provider, etc.)
// rather than re-embedded — see normalizers/schemaNormalizer.ts's
// header comment for why. Every field traces to
// organization.config.ts; nothing here re-derives or overrides that
// file's own values.

export function organizationId(): string {
  return buildId(ORGANIZATION.url, "organization");
}

function toContactPoint(contactPoint: SEOContactPoint): ContactPointNode {
  return { "@type": "ContactPoint", telephone: contactPoint.telephone, email: contactPoint.email, contactType: contactPoint.contactType, areaServed: contactPoint.areaServed };
}

export function buildOrganization(): OrganizationSchemaNode {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    logo: toImageObject(ORGANIZATION.logo),
    sameAs: [...ORGANIZATION.sameAs],
    contactPoint: ORGANIZATION.contactPoints.map(toContactPoint),
    founder: { "@type": "Person", name: ORGANIZATION.founder.name },
  };
}

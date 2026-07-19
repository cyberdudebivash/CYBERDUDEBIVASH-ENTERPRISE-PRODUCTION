import type { SEOService } from "../../types/entities";
import { ORGANIZATION } from "../../config/organization.config";
import { normalizeUrl } from "../../metadata";
import { buildId } from "../normalizers";
import { organizationId } from "./organizationBuilder";
import type { ServiceSchemaNode } from "../types/nodes";

// ServiceBuilder — one node per SEOService. `provider` references
// Organization by @id (this program's single source of truth) rather
// than the bare id string Phase 1.0's ServiceSchema.provider models —
// see types/schema.ts's own comment: "resolved by a future generator."
// This is that generator. No Offer/pricingTiers modeling here: pricing
// tier strings like "Custom" and "₹2.5L/mo" aren't safely
// machine-parseable into Offer.price without guessing at a
// currency/shorthand expansion — see documentation/SCHEMA_ENGINE.md's
// Known Risks. `mssp` has no `url` (no static page exists for it — see
// services.config.ts's own header comment) — its @id falls back to the
// organization's domain rather than a fabricated page URL.

function serviceId(service: SEOService): string {
  return service.url ? buildId(service.url, "service") : buildId(ORGANIZATION.url, `service-${service.id}`);
}

export function buildService(service: SEOService): ServiceSchemaNode {
  return {
    "@type": "Service",
    "@id": serviceId(service),
    name: service.name,
    description: service.description,
    url: service.url ? normalizeUrl(service.url) : undefined,
    provider: { "@id": organizationId() },
    areaServed: ORGANIZATION.contactPoints[0]?.areaServed,
  };
}

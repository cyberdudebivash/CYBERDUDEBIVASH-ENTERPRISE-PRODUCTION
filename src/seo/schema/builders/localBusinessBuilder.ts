import { ORGANIZATION } from "../../config/organization.config";
import { SITE_CONFIG } from "../../config/site.config";
import { buildId, toImageObject } from "../normalizers";
import type { LocalBusinessSchemaNode } from "../types/nodes";
import type { PostalAddressNode, GeoCoordinatesNode } from "../types/common";

// LocalBusinessBuilder — derives a LocalBusiness node from
// ORGANIZATION's address and SiteConfig's geo signals. A singleton,
// like Organization — the registry's default producer wiring attaches
// it only to the home page, matching the real, live LocalBusiness
// block directly found on index.html/_vite_entry.html during this
// phase (its @id and geo coordinates match this builder's output
// exactly — see documentation/SCHEMA_ENGINE.md's Pilot Comparison),
// not emitted site-wide.

function toPostalAddress(): PostalAddressNode {
  const address = ORGANIZATION.address;
  return {
    "@type": "PostalAddress",
    streetAddress: address.streetAddress,
    addressLocality: address.addressLocality,
    addressRegion: address.addressRegion,
    postalCode: address.postalCode,
    addressCountry: address.addressCountry,
  };
}

function toGeoCoordinates(): GeoCoordinatesNode {
  const [latitude, longitude] = SITE_CONFIG.geo.position;
  return { "@type": "GeoCoordinates", latitude, longitude };
}

export function localBusinessId(): string {
  return buildId(ORGANIZATION.url, "localbusiness");
}

export function buildLocalBusiness(): LocalBusinessSchemaNode {
  const primaryContact = ORGANIZATION.contactPoints[0];
  return {
    "@type": "LocalBusiness",
    "@id": localBusinessId(),
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    address: toPostalAddress(),
    geo: toGeoCoordinates(),
    telephone: primaryContact.telephone,
    image: toImageObject(ORGANIZATION.logo),
  };
}

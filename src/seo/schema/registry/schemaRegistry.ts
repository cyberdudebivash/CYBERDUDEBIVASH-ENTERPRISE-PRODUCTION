import type { SEOPage } from "../../types/page";
import { PRODUCTS, SERVICES, SOLUTIONS } from "../../config";
import { generatePageMetadata } from "../../metadata";
import { buildOrganization } from "../builders/organizationBuilder";
import { buildWebsite } from "../builders/websiteBuilder";
import { buildWebPage, buildAboutPage, buildContactPage } from "../builders/webPageBuilder";
import { buildBreadcrumbList } from "../builders/breadcrumbBuilder";
import { buildLocalBusiness } from "../builders/localBusinessBuilder";
import { buildService } from "../builders/serviceBuilder";
import { buildProduct } from "../builders/productBuilder";
import { buildSoftwareApplication } from "../builders/softwareApplicationBuilder";
import { toPageSchemaSet } from "../normalizers";
import type { SchemaNode, PageSchemaSet } from "../types/nodes";

// SchemaRegistry — deliberately a plain, immutable producer list plus
// pure functions, not a stateful class with imperative `.register()`
// calls, mirroring reports/generateReport.ts's own `VALIDATORS` array
// (the established precedent for "a fixed list of pure functions this
// program composes together"). Every builder this platform ships is
// required to be pure/deterministic/stateless; a mutable shared
// registry object would be the one piece of this platform that isn't.
// "Support future extension" means: pass a longer producer array,
// built with registerProducer — never runtime mutation of shared state.

export interface SchemaProducer {
  id: string;
  /** Returns the schema nodes this producer contributes for a given page, or [] if not applicable to it. */
  produce(page: SEOPage): SchemaNode[];
}

function webPageProducerProduce(page: SEOPage): SchemaNode[] {
  const metadata = generatePageMetadata(page);
  if (page.id === "about") return [buildAboutPage(metadata)];
  if (page.id === "contact") return [buildContactPage(metadata)];
  return [buildWebPage(metadata)];
}

export const organizationProducer: SchemaProducer = { id: "organization", produce: () => [buildOrganization()] };

export const websiteProducer: SchemaProducer = { id: "website", produce: () => [buildWebsite()] };

/** Emits WebPage for every page, narrowed to AboutPage/ContactPage for the two real pages of those kinds — see webPageBuilder.ts. */
export const webPageProducer: SchemaProducer = { id: "webPage", produce: webPageProducerProduce };

export const breadcrumbProducer: SchemaProducer = {
  id: "breadcrumb",
  produce: (page) => [buildBreadcrumbList(generatePageMetadata(page))],
};

/** Attached to the home page only — matches the real, live LocalBusiness block found on index.html/_vite_entry.html during this phase (directly verified; an earlier Phase 0 doc's claim that this lived on "contact/about pages" did not hold up when checked against the actual files — see documentation/SCHEMA_ENGINE.md's Pilot Comparison). */
export const localBusinessProducer: SchemaProducer = {
  id: "localBusiness",
  produce: (page) => (page.id === "home" ? [buildLocalBusiness()] : []),
};

/** Config-driven, not page-id-driven: attaches a Service to whichever page's `path` matches that service's own `url` — the same url<->path relationship Phase 1.0.5's validateRelationships already verified resolves cleanly for 5/6 services (`mssp` has no url and so never matches). */
export const serviceProducer: SchemaProducer = {
  id: "service",
  produce: (page) => SERVICES.filter((service) => service.url === page.path).map(buildService),
};

/** Config-driven via `relatedEntityIds` — the existing cross-reference field (SEO_DATA_MODEL.md), not a hardcoded page id. Emits nothing on any page that doesn't reference a product, which is most of them today (only "home" does). */
export const softwareApplicationProducer: SchemaProducer = {
  id: "softwareApplication",
  produce: (page) => {
    const relatedIds = new Set(page.relatedEntityIds ?? []);
    return PRODUCTS.filter((product) => relatedIds.has(product.id)).map(buildSoftwareApplication);
  },
};

/** Same `relatedEntityIds` mechanism as softwareApplicationProducer, for SOLUTIONS. Emits nothing today — no page's relatedEntityIds currently names a solution id (a real, evidenced gap, not a producer bug; see documentation/SCHEMA_ENGINE.md). */
export const productProducer: SchemaProducer = {
  id: "product",
  produce: (page) => {
    const relatedIds = new Set(page.relatedEntityIds ?? []);
    return SOLUTIONS.filter((solution) => relatedIds.has(solution.id)).map(buildProduct);
  },
};

export const DEFAULT_PRODUCERS: readonly SchemaProducer[] = [
  organizationProducer,
  websiteProducer,
  webPageProducer,
  breadcrumbProducer,
  localBusinessProducer,
  serviceProducer,
  softwareApplicationProducer,
  productProducer,
];

/** Returns a NEW producer list with `producer` appended — never mutates `producers`. Throws if a producer with the same id is already present, the same "prevent duplicates" guarantee applied to registration itself, not just generated output. */
export function registerProducer(producers: readonly SchemaProducer[], producer: SchemaProducer): SchemaProducer[] {
  if (producers.some((p) => p.id === producer.id)) {
    throw new Error(`registerProducer: a producer with id "${producer.id}" is already registered`);
  }
  return [...producers, producer];
}

export function resolveProducer(producers: readonly SchemaProducer[], id: string): SchemaProducer | undefined {
  return producers.find((p) => p.id === id);
}

/** Runs every producer against `page` and composes one deduplicated `@context` + `@graph` document — the Registry's core "compose page schema sets" responsibility. */
export function composePageSchemaSet(page: SEOPage, producers: readonly SchemaProducer[] = DEFAULT_PRODUCERS): PageSchemaSet {
  const nodes = producers.flatMap((producer) => producer.produce(page));
  return toPageSchemaSet(nodes);
}

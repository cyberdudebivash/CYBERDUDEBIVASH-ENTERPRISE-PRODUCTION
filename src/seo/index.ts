// The Enterprise SEO Data Model's public entry point. Not consumed by
// anything else in src/ yet (still zero runtime wiring — see each
// phase's own documentation/*.md for what "consumed" means per phase).
export * from "./types";
export * from "./config";
export * from "./utils";
// Phase 1.0.5's validation engine — validates the data model above, does
// not change it. See documentation/SEO_VALIDATION_REPORT.md.
export * from "./validators";
export * from "./reports";
// Phase 1.1's metadata engine — generates typed metadata objects from
// the config above. See documentation/SEO_METADATA_ENGINE.md.
export * from "./metadata";
// Phase 1.2's schema generation platform — generates typed Schema.org
// JSON-LD objects from the config and metadata above. See
// schema/documentation/SCHEMA_ENGINE.md.
export * from "./schema";
// Phase 1.3's relationship platform — a deterministic graph of
// entity/page relationships and ranked internal-link recommendations,
// derived from the config above. See
// relationships/documentation/RELATIONSHIP_ENGINE.md.
export * from "./relationships";
// Phase 1.4's commercial intelligence layer — an additive commercial
// enrichment overlay (12 pilot entities: about, 6 services, 5
// products), joined to the config above by entity id. See
// commercial/documentation/COMMERCIAL_MODEL.md.
export * from "./commercial";

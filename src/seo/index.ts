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

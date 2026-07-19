// The Enterprise SEO Runtime Platform's public entry point (Phase 1.5).
// The ONLY module a consumer outside src/seo/runtime/ should ever
// import from: generateSEO(pageId) and checkRuntimeHealth() are the
// Runtime Contract's complete public API, plus the types/errors needed
// to consume them and the adapters that transform a result into a
// concrete output shape. No consumer may import src/seo/metadata,
// src/seo/schema, src/seo/relationships, or src/seo/commercial
// directly once generateSEO() exists — they are implementation details
// this Runtime composes, not separate public entry points. See
// documentation/SEO_RUNTIME.md and documentation/PUBLIC_API.md.
//
// pipeline/ and cache/'s own modules are deliberately NOT re-exported
// here — they are the Runtime's own internals (composed by
// integration/generateSEO.ts and health/checkRuntimeHealth.ts), not
// part of the contract a consumer depends on.

export * from "./contracts";
export * from "./integration";
export * from "./health";
export * from "./adapters";

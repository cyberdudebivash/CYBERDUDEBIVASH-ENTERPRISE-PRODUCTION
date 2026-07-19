// The Enterprise Build Generation Platform's public entry point (Phase
// 2.0). Consumes ONLY the Runtime Platform (Phase 1.5) — no direct
// access to Metadata, Schema, Relationship, Commercial, or Validation
// engines. Transforms Runtime API output into production-ready
// artifacts (metadata, JSON-LD, sitemap, robots.txt, search index)
// written under dist/seo/, plus a build manifest and human-readable
// report. See documentation/BUILD_PLATFORM.md.
export * from "./artifacts";
export * from "./validators";
export * from "./manifests";
export * from "./reports";
export * from "./writers";
export * from "./generator";

// The Enterprise Schema Generation Platform's public entry point
// (Phase 1.2). Consumes src/seo/config/ (via builders), the Phase 1.1
// Metadata Engine (via page-level builders), and
// src/seo/validators/shared.ts (via SchemaValidator); never inspects
// HTML, the DOM, or the filesystem, and never emits a
// <script type="application/ld+json"> tag itself. See
// documentation/SCHEMA_ENGINE.md.
export * from "./types";
export * from "./normalizers";
export * from "./builders";
export * from "./entities";
export * from "./registry";
export * from "./validators";

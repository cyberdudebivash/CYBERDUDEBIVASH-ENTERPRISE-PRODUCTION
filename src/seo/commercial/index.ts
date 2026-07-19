// The Enterprise Commercial Intelligence Layer's public entry point
// (Phase 1.4). An additive overlay over src/seo/config/ (via
// CommercialProfile, joined by entity id/kind) and the Phase 1.3
// Relationship Platform (via recommendations/); reuses Phase 1.0.5's
// validators/shared.ts and validateCommercial()/validateCTA()
// directly. Never modifies src/seo/config/ or src/seo/types/, never
// generates HTML. See documentation/COMMERCIAL_MODEL.md.
export * from "./config";
export * from "./builders";
export * from "./recommendations";
export * from "./validators";
export * from "./reports";

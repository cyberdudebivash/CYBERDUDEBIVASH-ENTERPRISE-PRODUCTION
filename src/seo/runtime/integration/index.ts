// The Runtime Platform's integration layer (Phase 1.5) — thin
// composition wrappers around the Metadata Engine, Schema Platform,
// Relationship Platform, and Commercial Intelligence Layer's own
// public APIs. Every wrapper here calls the underlying engine exactly
// as any other consumer would; none of them modify a public API or
// duplicate business logic — composition, not inheritance, per this
// phase's own instruction. See documentation/ENGINE_INTEGRATION.md.
export * from "./resolvePage";
export * from "./classifyIssues";
export * from "./configurationIntegration";
export * from "./metadataIntegration";
export * from "./schemaIntegration";
export * from "./relationshipIntegration";
export * from "./commercialIntegration";

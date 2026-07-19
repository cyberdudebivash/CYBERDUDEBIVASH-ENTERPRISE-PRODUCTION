// The Enterprise Internal Linking & Relationship Platform's public
// entry point (Phase 1.3). Consumes src/seo/config/ (via the graph
// builder) and src/seo/validators/shared.ts (via RelationshipValidator);
// never inspects HTML, the DOM, or the filesystem, and never renders or
// emits a link. See documentation/RELATIONSHIP_ENGINE.md.
export * from "./graph";
export * from "./ranking";
export * from "./builders";
export * from "./validators";

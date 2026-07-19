// The Adapters layer's public entry point (Phase 1.5). Static HTML,
// React, SSR, and CLI — see documentation/ENGINE_INTEGRATION.md. A
// "Future API" adapter is deliberately not built here: no HTTP
// endpoint exists yet for it to serve, the same "reserved, not
// fabricated" discipline buildGraph.ts's own reserved relationship
// kinds already established in this codebase (see
// documentation/ENGINE_INTEGRATION.md's Known Risks).
export * from "./headTags";
export * from "./staticHtmlAdapter";
export * from "./ssrAdapter";
export * from "./reactAdapter";
export * from "./cliAdapter";

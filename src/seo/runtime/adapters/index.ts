// The Runtime Platform's adapters (Phase 1.5) — transformation only,
// no business logic; every one of these reshapes an already-computed
// SEORuntimeResult, never recomputes it. A "Future API" adapter (a
// JSON/REST response) needs no code of its own: SEORuntimeResult is
// already a plain, JSON.stringify-able object. See
// documentation/SEO_RUNTIME.md.
export * from "./staticHtmlAdapter";
export * from "./reactAdapter";
export * from "./ssrAdapter";
export * from "./cliAdapter";

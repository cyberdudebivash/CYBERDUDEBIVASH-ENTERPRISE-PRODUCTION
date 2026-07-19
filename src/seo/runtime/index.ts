// The Enterprise SEO Runtime Platform's public entry point (Phase
// 1.5). The ONLY supported way to consume the SEO platform going
// forward: "No page, React component, build script, CLI, API, or
// future automation may call individual engines directly. Everything
// flows through the runtime." Integrates the Metadata Engine (Phase
// 1.1), Schema Platform (Phase 1.2), Relationship Platform (Phase
// 1.3), and Commercial Intelligence Layer (Phase 1.4) by composition,
// never by modifying any of their public APIs. See
// documentation/SEO_RUNTIME.md.
export * from "./contracts";
export * from "./cache";
export * from "./integration";
export * from "./diagnostics";
export * from "./health";
export * from "./pipeline";
export * from "./adapters";
export * from "./runtime";

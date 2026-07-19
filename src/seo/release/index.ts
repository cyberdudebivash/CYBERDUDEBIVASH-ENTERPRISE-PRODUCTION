// The Enterprise Release Management & Deployment Platform's public
// entry point (Phase 2.1). Consumes ONLY Build Platform's
// already-written output directory (dist/seo/ by default) — never
// calls Runtime or Build Platform's own generation functions. Deploys
// exclusively to dist/release/, never public/ or any production
// directory. See documentation/RELEASE_PLATFORM.md.
export * from "./planner";
export * from "./locking";
export * from "./staging";
export * from "./verification";
export * from "./publisher";
export * from "./rollback";
export * from "./health";
export * from "./reports";
export * from "./runRelease";

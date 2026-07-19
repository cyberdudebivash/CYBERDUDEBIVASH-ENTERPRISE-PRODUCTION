// The Build Generation Platform's generator (Phase 2.0) — deterministic
// orchestration consuming ONLY the Runtime API (plus page-id
// enumeration — see pageIds.ts). See documentation/GENERATION_STRATEGY.md.
export * from "./pageIds";
export * from "./generatePage";
export * from "./generateSite";
export * from "./incrementalBuild";
export * from "./runBuild";

// The Build Generation Platform's own validators (Phase 2.0) —
// build-level concerns only (artifact well-formedness, manifest
// consistency); the underlying SEO data was already validated by the
// Runtime Platform before this layer ever saw it. See
// documentation/ARTIFACT_PIPELINE.md.
export * from "./artifactValidator";
export * from "./errors";

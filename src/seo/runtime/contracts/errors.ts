// Owns: the Runtime Platform's typed error hierarchy — "Typed errors
// only" per this phase's own instruction. Every stage of the pipeline
// throws one of these rather than a bare Error, so a caller can branch
// on `instanceof` / `error.code` instead of parsing a message string.
// Wraps the underlying engines' own (untyped) failures rather than
// changing how those engines fail — see integration/*.ts.

export type SEORuntimeErrorCode =
  | "CONFIGURATION_ERROR"
  | "PIPELINE_ERROR"
  | "VALIDATION_ERROR"
  | "RELATIONSHIP_ERROR"
  | "RUNTIME_HEALTH_ERROR"
  | "DUPLICATE_ENTITY_ERROR";

export abstract class SEORuntimeError extends Error {
  abstract readonly code: SEORuntimeErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The requested pageId (or another configuration-level reference) does not resolve to a real record. */
export class ConfigurationError extends SEORuntimeError {
  readonly code = "CONFIGURATION_ERROR" as const;
}

/** A pipeline stage failed for a reason that isn't itself a validation failure (e.g. an unexpected exception from a composed engine). */
export class PipelineError extends SEORuntimeError {
  readonly code = "PIPELINE_ERROR" as const;
}

/** A composed engine's own validator reported one or more error-severity issues; the runtime refuses to return a partially-valid result. */
export class ValidationError extends SEORuntimeError {
  readonly code = "VALIDATION_ERROR" as const;
}

/** The relationship graph, or a page's recommendations, failed Phase 1.3's own validation (dangling reference, self-reference, orphan-as-error, etc.). */
export class RelationshipError extends SEORuntimeError {
  readonly code = "RELATIONSHIP_ERROR" as const;
}

/** Thrown by assertRuntimeHealthy() when a platform-wide health check's status is "error" — see health/. */
export class RuntimeHealthError extends SEORuntimeError {
  readonly code = "RUNTIME_HEALTH_ERROR" as const;
}

/** A duplicate-detection check (duplicate @id, duplicate relationship edge, duplicate recommendation) failed — a narrower, more actionable classification than a generic ValidationError/RelationshipError for this one recurring failure shape. */
export class DuplicateEntityError extends SEORuntimeError {
  readonly code = "DUPLICATE_ENTITY_ERROR" as const;
}

import type { ValidationIssue } from "../../validators/shared";

// The Runtime Platform's typed error vocabulary (Phase 1.5). Every
// failure the pipeline can produce is one of these six — never a bare
// `Error`, never a string thrown, never a silently-returned `undefined`
// standing in for a failure. A consumer catching `SEORuntimeError` can
// safely assume every runtime failure has a stable `code` and a `stage`
// it failed in; catching one of the six concrete subclasses narrows to
// exactly what went wrong. Mirrors this codebase's existing
// discriminated-severity style (validators/shared.ts's ValidationIssue)
// rather than inventing a second error vocabulary.

export type SEORuntimeErrorCode =
  | "CONFIGURATION_ERROR"
  | "PIPELINE_ERROR"
  | "VALIDATION_ERROR"
  | "RELATIONSHIP_ERROR"
  | "RUNTIME_HEALTH_ERROR"
  | "DUPLICATE_ENTITY_ERROR";

/** Base class every Runtime error extends. Never thrown directly — always one of the six concrete subclasses below. */
export abstract class SEORuntimeError extends Error {
  abstract readonly code: SEORuntimeErrorCode;
  readonly stage: string;

  protected constructor(message: string, stage: string) {
    super(message);
    this.name = new.target.name;
    this.stage = stage;
  }
}

/** The requested pageId does not resolve to a real SEOPage, or another Configuration-stage input is missing/malformed. Thrown before any engine runs. */
export class ConfigurationError extends SEORuntimeError {
  readonly code = "CONFIGURATION_ERROR" as const;
  constructor(message: string, stage = "configuration") {
    super(message, stage);
  }
}

/** A pipeline stage (Metadata, Schema, or Commercial — the stages with no more specific typed error) failed to compose its engine's output for this page. */
export class PipelineError extends SEORuntimeError {
  readonly code = "PIPELINE_ERROR" as const;
  constructor(message: string, stage: string) {
    super(message, stage);
  }
}

/** The Validation stage found error-severity issues in the whole-platform validation report, a composed schema set, or generated metadata. Carries the offending issues so a caller can inspect them without re-running validation. */
export class ValidationError extends SEORuntimeError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly issues: ValidationIssue[];
  constructor(message: string, issues: ValidationIssue[], stage = "validation") {
    super(message, stage);
    this.issues = issues;
  }
}

/** The Relationships stage's graph or this page's recommendations failed RelationshipValidator's checks (a dangling reference, an invalid self-reference, a broken graph invariant). */
export class RelationshipError extends SEORuntimeError {
  readonly code = "RELATIONSHIP_ERROR" as const;
  readonly issues: ValidationIssue[];
  constructor(message: string, issues: ValidationIssue[], stage = "relationships") {
    super(message, stage);
    this.issues = issues;
  }
}

/** checkRuntimeHealth() found the platform in a non-recoverable state (e.g. the relationship graph cannot be constructed at all). Never thrown by generateSEO() itself — generateSEO() throws the more specific error for whichever stage actually failed. */
export class RuntimeHealthError extends SEORuntimeError {
  readonly code = "RUNTIME_HEALTH_ERROR" as const;
  constructor(message: string, stage = "health") {
    super(message, stage);
  }
}

/** More than one record in a config collection shares the id the Configuration stage resolved against — a data-integrity failure distinct from the known, documented cross-collection id ambiguity ValidateConfiguration already tracks (see resolveCommercialEntity.ts and SEO_VALIDATION_REPORT.md's Configuration Health section). */
export class DuplicateEntityError extends SEORuntimeError {
  readonly code = "DUPLICATE_ENTITY_ERROR" as const;
  readonly entityId: string;
  constructor(message: string, entityId: string, stage = "configuration") {
    super(message, stage);
    this.entityId = entityId;
  }
}

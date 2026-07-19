import type { ValidationIssue } from "../../validators/shared";
import { DuplicateEntityError, ValidationError, RelationshipError } from "../contracts/errors";

// classifyIssues — the one place error-severity ValidationIssues are
// turned into a typed SEORuntimeError. A duplicate-detection code
// (SCHEMA_DUPLICATE_ID, RELATIONSHIP_DUPLICATE_EDGE,
// RECOMMENDATION_DUPLICATE — every one of this platform's own
// "prevent duplicates" checks) is classified as DuplicateEntityError
// regardless of which stage raised it, since "this pipeline stage
// detected a duplicate entity" is a more specific, more actionable
// fact than which particular engine happened to notice it first.

function describe(context: string, issues: readonly ValidationIssue[]): string {
  return `${context}: ${issues.map((i) => `[${i.code}] ${i.message}`).join("; ")}`;
}

export function errorSeverity(issues: readonly ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.severity === "error");
}

export function throwForSchemaIssues(context: string, issues: readonly ValidationIssue[]): never {
  const message = describe(context, issues);
  throw issues.some((i) => i.code.includes("DUPLICATE")) ? new DuplicateEntityError(message) : new ValidationError(message);
}

export function throwForRelationshipIssues(context: string, issues: readonly ValidationIssue[]): never {
  const message = describe(context, issues);
  throw issues.some((i) => i.code.includes("DUPLICATE")) ? new DuplicateEntityError(message) : new RelationshipError(message);
}

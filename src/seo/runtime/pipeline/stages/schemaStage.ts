import { composePageSchemaSet } from "../../../schema/registry/schemaRegistry";
import { validatePageSchemaSet } from "../../../schema/validators/schemaValidator";
import type { PageSchemaSet } from "../../../schema/types/nodes";
import type { SEOPage } from "../../../types/page";
import type { ValidationIssue } from "../../../validators/shared";
import { PipelineError } from "../../contracts/errors";

export interface SchemaStageResult {
  schemas: PageSchemaSet;
  warnings: ValidationIssue[];
}

// SchemaStage — composes Phase 1.2's Schema Generation Platform via its
// own composition root (composePageSchemaSet, DEFAULT_PRODUCERS) rather
// than calling individual builders directly — this Runtime is exactly
// the kind of future consumer schemaRegistry.ts's own header comment
// anticipated. Unlike MetadataEngine, composePageSchemaSet() does not
// validate its own output, so this stage does that explicitly and
// throws a typed PipelineError on any error-severity issue — the same
// "no generated object may bypass validation" guarantee this platform
// applies at every stage.

export function runSchemaStage(page: SEOPage): SchemaStageResult {
  const schemas = composePageSchemaSet(page);
  const result = validatePageSchemaSet(schemas);
  const errors = result.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new PipelineError(
      `schema stage failed for page "${page.id}": ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      "schema",
    );
  }
  const warnings = result.issues.filter((issue) => issue.severity === "warning");
  return { schemas, warnings };
}

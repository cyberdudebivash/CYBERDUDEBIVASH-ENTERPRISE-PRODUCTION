import type { SEOPage } from "../../types/page";
import { composePageSchemaSet, validatePageSchemaSet } from "../../schema";
import type { PageSchemaSet } from "../../schema";
import { errorSeverity, throwForSchemaIssues } from "./classifyIssues";

// schemaIntegration — a thin composition wrapper around Phase 1.2's
// composePageSchemaSet()/validatePageSchemaSet(). Unlike
// generatePageMetadata(), the Schema Platform's own public API
// deliberately keeps composition and validation as two separate calls
// (SCHEMA_ENGINE.md); this is the one place the runtime pipeline
// enforces "no generated schema may bypass validation" by always
// calling both together.

export function integrateSchema(page: SEOPage): PageSchemaSet {
  const schemaSet = composePageSchemaSet(page);
  const errors = errorSeverity(validatePageSchemaSet(schemaSet).issues);
  if (errors.length > 0) {
    throwForSchemaIssues(`integrateSchema("${page.id}")`, errors);
  }
  return schemaSet;
}

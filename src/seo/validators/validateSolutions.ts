import { SOLUTIONS } from "../config";
import type { SEOSolution } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates SEOSolution-intrinsic structure: identity uniqueness (id/url/
// name) and completeness of optional-but-expected fields (price, image).

export function validateSolutions(solutions: readonly SEOSolution[] = SOLUTIONS): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(solutions, (s) => s.id)) {
    issues.push(issue("error", "SOLUTION_DUPLICATE_ID", `${group.length} solutions share id "${id}"`, id));
  }
  for (const [url, group] of findDuplicates(solutions, (s) => s.url)) {
    issues.push(issue("error", "SOLUTION_DUPLICATE_URL", `${group.length} solutions share url "${url}"`, group.map((s) => s.id).join(", ")));
  }
  for (const [name, group] of findDuplicates(solutions, (s) => s.name)) {
    issues.push(issue("warning", "SOLUTION_DUPLICATE_NAME", `${group.length} solutions share the name "${name}"`, group.map((s) => s.id).join(", ")));
  }

  for (const solution of solutions) {
    if (isMissing(solution.price)) {
      issues.push(issue("warning", "SOLUTION_MISSING_PRICE", `Solution "${solution.id}" has no price`, solution.id));
    }
    if (isMissing(solution.image)) {
      issues.push(issue("warning", "SOLUTION_MISSING_IMAGE", `Solution "${solution.id}" has no image`, solution.id));
    }
  }

  return makeResult("validateSolutions", issues);
}

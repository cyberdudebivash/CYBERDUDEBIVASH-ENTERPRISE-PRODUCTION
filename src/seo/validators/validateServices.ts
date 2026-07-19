import { SERVICES } from "../config";
import type { SEOService } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates SEOService-intrinsic structure: identity uniqueness (id/url/
// name) and completeness of optional-but-expected fields (url, image).
// pricingTiers is deliberately NOT flagged when absent — dpdp/owasp/pentest
// genuinely have no tier data in their source (ServicePages.tsx uses a
// different content shape for them), so an empty pricingTiers is a real,
// evidenced business state, not a gap to warn about.

export function validateServices(services: readonly SEOService[] = SERVICES): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(services, (s) => s.id)) {
    issues.push(issue("error", "SERVICE_DUPLICATE_ID", `${group.length} services share id "${id}"`, id));
  }
  for (const [url, group] of findDuplicates(services, (s) => s.url)) {
    issues.push(issue("error", "SERVICE_DUPLICATE_URL", `${group.length} services share url "${url}"`, group.map((s) => s.id).join(", ")));
  }
  for (const [name, group] of findDuplicates(services, (s) => s.name)) {
    issues.push(issue("warning", "SERVICE_DUPLICATE_NAME", `${group.length} services share the name "${name}"`, group.map((s) => s.id).join(", ")));
  }

  for (const service of services) {
    if (isMissing(service.url)) {
      issues.push(issue("warning", "SERVICE_MISSING_URL", `Service "${service.id}" has no url`, service.id));
    }
    if (isMissing(service.image)) {
      issues.push(issue("warning", "SERVICE_MISSING_IMAGE", `Service "${service.id}" has no image`, service.id));
    }
  }

  return makeResult("validateServices", issues);
}

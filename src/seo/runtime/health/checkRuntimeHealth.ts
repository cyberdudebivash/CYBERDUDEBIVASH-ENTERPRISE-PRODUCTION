import { PAGES } from "../../config";
import { findDuplicates } from "../../validators/shared";
import { generateValidationReport } from "../../reports/generateReport";
import { buildRelationshipGraph } from "../../relationships/graph/buildGraph";
import { validateRelationshipGraph } from "../../relationships/validators/relationshipValidator";
import { buildAllCommercialViews } from "../../commercial/builders/buildCommercialView";
import { validateAllCommercialViews } from "../../commercial/validators/commercialValidator";
import { runPipeline } from "../pipeline/runPipeline";
import { RuntimeHealthError } from "../contracts/errors";
import type { SEORuntimeHealthCheck, SEORuntimeHealthStatus } from "./types";

// checkRuntimeHealth — the Runtime's platform-wide self-check (see
// documentation/RUNTIME_HEALTH.md). Every dimension degrades from
// "healthy" to "warning" to "error" independently; overall `status` is
// the worst of the five. Never throws for an expected finding (a
// validation error, a broken graph, a page that fails its pipeline) —
// those all surface as `status: "error"` plus a human-readable entry in
// `issues`, exactly what a caller polling this for an operational
// dashboard needs. Only rethrows (as RuntimeHealthError) if computing
// the check itself crashes unexpectedly — a bug in this function, not a
// finding about the platform it's checking.

function worse(a: SEORuntimeHealthStatus, b: SEORuntimeHealthStatus): SEORuntimeHealthStatus {
  const rank: Record<SEORuntimeHealthStatus, number> = { healthy: 0, warning: 1, error: 2 };
  return rank[b] > rank[a] ? b : a;
}

function checkConfiguration(issues: string[]): SEORuntimeHealthStatus {
  if (PAGES.length === 0) {
    issues.push("configuration: PAGES is empty — the Runtime has no page to generate output for");
    return "error";
  }
  const duplicates = findDuplicates(PAGES, (page) => page.id);
  if (duplicates.size > 0) {
    issues.push(`configuration: ${duplicates.size} id(s) are duplicated within PAGES — ${Array.from(duplicates.keys()).join(", ")}`);
    return "error";
  }
  return "healthy";
}

function checkValidation(issues: string[]): SEORuntimeHealthStatus {
  const report = generateValidationReport();
  if (report.summary.errorCount > 0) {
    issues.push(`validation: ${report.summary.errorCount} platform validation error(s)`);
    return "error";
  }
  if (report.summary.warningCount > 0) {
    issues.push(`validation: ${report.summary.warningCount} platform validation warning(s)`);
    return "warning";
  }
  return "healthy";
}

function checkRelationships(issues: string[]): SEORuntimeHealthStatus {
  const graph = buildRelationshipGraph();
  const result = validateRelationshipGraph(graph);
  const errors = result.issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    issues.push(`relationships: ${errors.length} relationship graph error(s)`);
    return "error";
  }
  const warnings = result.issues.filter((i) => i.severity === "warning");
  if (warnings.length > 0) {
    issues.push(`relationships: ${warnings.length} relationship graph warning(s)`);
    return "warning";
  }
  return "healthy";
}

function checkCommercial(issues: string[]): SEORuntimeHealthStatus {
  const views = buildAllCommercialViews();
  const result = validateAllCommercialViews(views);
  const errors = result.issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    issues.push(`commercial: ${errors.length} commercial view error(s)`);
    return "error";
  }
  const warnings = result.issues.filter((i) => i.severity === "warning");
  if (warnings.length > 0) {
    issues.push(`commercial: ${warnings.length} commercial view warning(s)`);
    return "warning";
  }
  return "healthy";
}

function checkPipeline(issues: string[]): SEORuntimeHealthStatus {
  const failures: string[] = [];
  for (const page of PAGES) {
    try {
      runPipeline(page.id);
    } catch (error) {
      failures.push(`"${page.id}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    issues.push(`pipeline: ${failures.length}/${PAGES.length} page(s) failed generation — ${failures.join(" | ")}`);
    return "error";
  }
  return "healthy";
}

export function checkRuntimeHealth(): SEORuntimeHealthCheck {
  try {
    const issues: string[] = [];

    const configuration = checkConfiguration(issues);
    const validation = checkValidation(issues);
    const relationships = checkRelationships(issues);
    const commercial = checkCommercial(issues);
    // Runs last: a broken Configuration/Validation/Relationships/Commercial
    // dimension will already explain itself via the checks above, so the
    // pipeline check's own failures add signal only when it fails for a
    // reason none of the other four caught.
    const pipeline = checkPipeline(issues);

    const status = [configuration, validation, relationships, commercial, pipeline].reduce(worse, "healthy" as SEORuntimeHealthStatus);

    return {
      status,
      checkedAt: new Date().toISOString(),
      configuration,
      pipeline,
      relationships,
      validation,
      commercial,
      issues,
    };
  } catch (error) {
    throw new RuntimeHealthError(`checkRuntimeHealth: failed to compute the health check itself: ${error instanceof Error ? error.message : String(error)}`);
  }
}

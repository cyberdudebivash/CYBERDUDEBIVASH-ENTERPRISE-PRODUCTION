import { PAGES } from "../../config";
import { buildRelationshipGraph, validateRelationshipGraph } from "../../relationships";
import { buildAllCommercialViews, validateAllCommercialViews } from "../../commercial";
import { buildValidatedConfigurationReport } from "../integration/configurationIntegration";
import { runPipeline } from "../pipeline/runtimePipeline";
import { RuntimeHealthError } from "../contracts/errors";
import type { RuntimeHealthReport, RuntimeHealthStatus } from "../contracts/types";

// buildHealth — the HEALTH section's platform-wide fitness snapshot,
// distinct from generateSEO()'s per-page RuntimeDiagnostics. Runs the
// full pipeline against every real page (PAGES) so pipeline failures a
// single-page call would never surface are visible here, alongside
// fresh configuration/relationship/commercial validation runs — the
// same three checks Step 2 of this phase's own resume protocol used
// to confirm baselines before implementation began.

function statusFor(errorCount: number, warningCount: number): RuntimeHealthStatus {
  if (errorCount > 0) return "error";
  if (warningCount > 0) return "warning";
  return "healthy";
}

function worstOf(statuses: readonly RuntimeHealthStatus[]): RuntimeHealthStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("warning")) return "warning";
  return "healthy";
}

export function getRuntimeHealth(): RuntimeHealthReport {
  const configurationReport = (() => {
    try {
      return buildValidatedConfigurationReport();
    } catch {
      // buildValidatedConfigurationReport() throws on any error-severity
      // issue; health reporting needs the full report (including the
      // errors themselves) rather than an exception, so it re-derives
      // the raw report directly. See generateValidationReport's own
      // contract: it never throws, only aggregates.
      return undefined;
    }
  })();

  const configIssues = configurationReport?.results.flatMap((r) => r.issues) ?? [];
  const configErrors = configIssues.filter((i) => i.severity === "error");
  const configWarnings = configIssues.filter((i) => i.severity === "warning");

  const graph = buildRelationshipGraph();
  const graphIssues = validateRelationshipGraph(graph).issues;
  const graphErrors = graphIssues.filter((i) => i.severity === "error");
  const graphWarnings = graphIssues.filter((i) => i.severity === "warning");

  const commercialViews = buildAllCommercialViews();
  const commercialIssues = validateAllCommercialViews(commercialViews).issues;
  const commercialErrors = commercialIssues.filter((i) => i.severity === "error");
  const commercialWarnings = commercialIssues.filter((i) => i.severity === "warning");

  const pipelineFailures: string[] = [];
  if (configurationReport) {
    for (const page of PAGES) {
      try {
        runPipeline(page.id, graph, configurationReport);
      } catch (cause) {
        pipelineFailures.push(`"${page.id}": ${(cause as Error).message}`);
      }
    }
  } else {
    pipelineFailures.push("configuration validation failed — no page's pipeline was attempted");
  }

  // Field-completeness gaps (PAGE_MISSING_DESCRIPTION,
  // COMMERCIAL_INTELLIGENCE_FIELD_MISSING, etc. — by far the largest
  // code family in the 16 domain validators) are deliberately NOT
  // itemized into any bucket below: they are real, but they describe
  // incomplete DATA on entities that exist, not one of this section's
  // five named categories. They still drive `configWarnings`/
  // `commercialWarnings` (and therefore the "warning" status), so
  // nothing about them is lost — only their itemization here, which
  // would otherwise bury the four categories the HEALTH section
  // actually asks for under ~90 field-completeness messages.
  const duplicateIds = [...configIssues, ...graphIssues].filter((i) => i.code.includes("DUPLICATE")).map((i) => i.message);
  const brokenReferences = [...configIssues, ...graphIssues]
    .filter((i) => i.code.includes("DANGLING") || i.code.includes("UNRESOLVED"))
    .map((i) => i.message);
  /** An entity structurally absent from the platform's own graphs despite existing in config: orphaned from navigation, orphaned from the relationship graph, or never referenced anywhere. */
  const missingEntities = [...configIssues, ...graphIssues]
    .filter((i) => i.code.includes("ORPHAN") || i.code.includes("UNUSED") || i.code === "CONFIG_EMPTY_COLLECTION")
    .map((i) => i.message);
  const configurationIssues = configErrors.map((i) => i.message);

  const configuration = statusFor(configErrors.length, configWarnings.length);
  const relationships = statusFor(graphErrors.length, graphWarnings.length);
  const commercial = statusFor(commercialErrors.length, commercialWarnings.length);
  const pipeline = statusFor(pipelineFailures.length, 0);
  const validation = statusFor(configErrors.length, configWarnings.length);

  return {
    status: worstOf([configuration, pipeline, relationships, validation, commercial]),
    configuration,
    pipeline,
    relationships,
    validation,
    commercial,
    issues: { missingEntities, brokenReferences, duplicateIds, configurationIssues, pipelineFailures },
  };
}

/** Throws RuntimeHealthError when the platform-wide status is "error" — an opt-in strict gate for CI/build tooling, rather than every caller re-implementing its own "if report.status === 'error'" check. */
export function assertRuntimeHealthy(report: RuntimeHealthReport = getRuntimeHealth()): void {
  if (report.status === "error") {
    const reasons = [...report.issues.configurationIssues, ...report.issues.pipelineFailures];
    throw new RuntimeHealthError(`assertRuntimeHealthy: platform status is "error" — ${reasons.join("; ")}`);
  }
}

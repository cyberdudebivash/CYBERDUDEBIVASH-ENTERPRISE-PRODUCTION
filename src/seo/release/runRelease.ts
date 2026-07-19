import type { ValidationResult } from "../validators/shared";
import { createReleasePlan } from "./planner/createReleasePlan";
import type { ReleaseMode, ReleasePlan } from "./planner/types";
import { acquireLock, releaseLock } from "./locking/releaseLock";
import { stageRelease } from "./staging/stageRelease";
import type { StagingMode } from "./staging/types";
import { verifyRelease } from "./verification/verifyRelease";
import { ReleaseVerificationError } from "./verification/errors";
import { publishRelease } from "./publisher/publishRelease";
import { DEFAULT_RELEASE_ROOT } from "./publisher/layout";
import { readCurrentReleaseManifest } from "./publisher/readReleaseState";
import { buildReleaseReportData, writeReleaseReport } from "./reports/releaseReport";
import { rollbackRelease } from "./rollback/rollbackRelease";
import type { RollbackManifest, RollbackTarget } from "./rollback/types";
import { writeRollbackReport } from "./reports/rollbackReport";
import { getReleaseHealth } from "./health/releaseHealth";
import type { ReleaseHealthReport } from "./health/types";
import { writeDeploymentHealthReport } from "./reports/deploymentHealthReport";

// runRelease — the Release Platform's single top-level entry point.
// Consumes ONLY Build Platform's already-written output directory
// (`sourceDir`, default "dist/seo" — matching Build Platform's own
// DEFAULT_OUT_DIR by file-path CONVENTION, not by importing it: this
// platform's only coupling to Build Platform anywhere is the
// type-only `BuildManifest` import in planner/readBuildManifest.ts).
// Never calls generateSEO, createSEORuntime, or runBuild.

export const DEFAULT_SOURCE_DIR = "dist/seo";

export interface RunReleaseOptions {
  mode: ReleaseMode;
  sourceDir?: string;
  releaseRoot?: string;
}

export interface RunReleaseResult {
  plan: ReleasePlan;
  verification: ValidationResult;
  published: boolean;
  releaseId: string;
  reportPath: string | undefined;
}

async function runDryRun(sourceDir: string, releaseRoot: string): Promise<RunReleaseResult> {
  const previousManifest = await readCurrentReleaseManifest(releaseRoot);
  const plan = await createReleasePlan(sourceDir, previousManifest);
  // Nothing is staged for a dry run, so verification checks the plan against `sourceDir` itself — the closest read-only equivalent of "would this release pass verification."
  const verification = await verifyRelease(plan, sourceDir);
  return { plan, verification, published: false, releaseId: plan.releaseId, reportPath: undefined };
}

async function runLockedRelease(mode: Exclude<ReleaseMode, "dry-run">, sourceDir: string, releaseRoot: string): Promise<RunReleaseResult> {
  const lock = await acquireLock(releaseRoot);
  try {
    const previousManifest = await readCurrentReleaseManifest(releaseRoot);
    const plan = await createReleasePlan(sourceDir, previousManifest);

    const stagingMode: StagingMode = mode === "incremental" ? "incremental" : "full";
    const staged = await stageRelease(plan, releaseRoot, stagingMode);
    const verification = await verifyRelease(plan, staged.stagingDir);

    const errors = verification.issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      throw new ReleaseVerificationError(`runRelease("${mode}"): release "${plan.releaseId}" failed verification — ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`);
    }

    let published = false;
    let publishedAt: string | undefined;
    if (mode === "full" || mode === "incremental") {
      const manifest = await publishRelease(plan, staged.stagingDir, releaseRoot);
      published = true;
      publishedAt = manifest.publishedAt;
    }
    // "preview" mode: staged and verified, deliberately left un-promoted and inspectable at staged.stagingDir — "never publish directly."

    const reportData = buildReleaseReportData(plan, mode, publishedAt, verification.issues);
    const reportPath = await writeReleaseReport(releaseRoot, reportData);

    return { plan, verification, published, releaseId: plan.releaseId, reportPath };
  } finally {
    await releaseLock(lock);
  }
}

export async function runRelease(options: RunReleaseOptions): Promise<RunReleaseResult> {
  const sourceDir = options.sourceDir ?? DEFAULT_SOURCE_DIR;
  const releaseRoot = options.releaseRoot ?? DEFAULT_RELEASE_ROOT;

  if (options.mode === "dry-run") return runDryRun(sourceDir, releaseRoot);
  return runLockedRelease(options.mode, sourceDir, releaseRoot);
}

export interface RunRollbackResult {
  manifest: RollbackManifest;
  reportPath: string;
}

export async function runRollback(target: RollbackTarget, dryRun: boolean, releaseRoot: string = DEFAULT_RELEASE_ROOT): Promise<RunRollbackResult> {
  const lock = await acquireLock(releaseRoot);
  try {
    const manifest = await rollbackRelease(releaseRoot, target, dryRun);
    const reportPath = await writeRollbackReport(releaseRoot, manifest);
    return { manifest, reportPath };
  } finally {
    await releaseLock(lock);
  }
}

export interface RunHealthCheckResult {
  health: ReleaseHealthReport;
  reportPath: string;
}

export async function runDeploymentHealthCheck(releaseRoot: string = DEFAULT_RELEASE_ROOT): Promise<RunHealthCheckResult> {
  const health = await getReleaseHealth(releaseRoot);
  const reportPath = await writeDeploymentHealthReport(releaseRoot, health);
  return { health, reportPath };
}

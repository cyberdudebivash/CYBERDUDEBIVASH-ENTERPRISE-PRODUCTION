import { releaseDir } from "../publisher/layout";
import { repointCurrent } from "../publisher/publishRelease";
import { readCurrentPointer, readReleaseManifest } from "../publisher/readReleaseState";
import { verifyRelease } from "../verification/verifyRelease";
import { ReleaseRollbackError } from "./errors";
import type { RollbackManifest, RollbackTarget } from "./types";

// rollbackRelease — re-points current.json at an already-published,
// already-on-disk release directory. Every release directory is
// immutable once published (publisher/publishRelease.ts never
// overwrites an existing releases/<id>/), so "rollback" never
// regenerates or re-copies artifacts — it only changes which
// already-verified directory `current.json` names. "Integrity
// verification before rollback": the target release is re-verified
// (verifyRelease — the same check a fresh publish runs) before
// current.json is touched, so a corrupted or manually-tampered
// release directory can never become "current" via rollback.

async function resolveTarget(releaseRoot: string, target: RollbackTarget): Promise<{ fromReleaseId: string | undefined; toReleaseId: string }> {
  const current = await readCurrentPointer(releaseRoot);
  const fromReleaseId = current?.releaseId;

  if (target !== "latest") return { fromReleaseId, toReleaseId: target.releaseId };

  if (!current) throw new ReleaseRollbackError("rollbackRelease: no release is currently published — nothing to roll back from");
  const currentManifest = await readReleaseManifest(releaseRoot, current.releaseId);
  if (!currentManifest?.previousReleaseId) {
    throw new ReleaseRollbackError(`rollbackRelease: release "${current.releaseId}" has no earlier release recorded — nothing to roll back to`);
  }
  return { fromReleaseId, toReleaseId: currentManifest.previousReleaseId };
}

export async function rollbackRelease(releaseRoot: string, target: RollbackTarget, dryRun: boolean): Promise<RollbackManifest> {
  const { fromReleaseId, toReleaseId } = await resolveTarget(releaseRoot, target);

  const targetManifest = await readReleaseManifest(releaseRoot, toReleaseId);
  if (!targetManifest) {
    throw new ReleaseRollbackError(`rollbackRelease: release "${toReleaseId}" has no RELEASE_MANIFEST.json — it was never published, or its record is gone`);
  }

  const verification = await verifyRelease(targetManifest, releaseDir(releaseRoot, toReleaseId));
  const errors = verification.issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new ReleaseRollbackError(`rollbackRelease: release "${toReleaseId}" failed integrity verification — ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`);
  }

  if (!dryRun) {
    await repointCurrent(releaseRoot, toReleaseId);
  }

  return { fromReleaseId, toReleaseId, rolledBackAt: new Date().toISOString(), dryRun, verificationIssues: verification.issues };
}

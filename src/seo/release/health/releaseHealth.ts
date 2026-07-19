import { releaseDir } from "../publisher/layout";
import { readCurrentPointer, readReleaseManifest } from "../publisher/readReleaseState";
import { readLock } from "../locking/releaseLock";
import { verifyRelease } from "../verification/verifyRelease";
import type { ReleaseHealthReport, ReleaseHealthStatus } from "./types";

// releaseHealth — a deterministic Healthy/Warning/Blocked snapshot of
// `releaseRoot`'s current state. Every reason string is a fixed,
// enumerable constant (never interpolated free text) so "reasons must
// be deterministic" holds literally: the same underlying condition
// always produces the exact same reason string.

const REASON_NO_RELEASE_PUBLISHED = "no release has been published yet";
const REASON_CURRENT_MANIFEST_MISSING = "current.json points at a release with no RELEASE_MANIFEST.json";
const REASON_CURRENT_RELEASE_FAILED_VERIFICATION = "the current release failed integrity verification";
const REASON_LOCK_HELD = "a release lock is currently held";

function worstOf(statuses: readonly ReleaseHealthStatus[]): ReleaseHealthStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("warning")) return "warning";
  return "healthy";
}

export async function getReleaseHealth(releaseRoot: string): Promise<ReleaseHealthReport> {
  const reasons: string[] = [];
  const statuses: ReleaseHealthStatus[] = [];

  const pointer = await readCurrentPointer(releaseRoot);
  if (!pointer) {
    reasons.push(REASON_NO_RELEASE_PUBLISHED);
    statuses.push("warning");
  } else {
    const manifest = await readReleaseManifest(releaseRoot, pointer.releaseId);
    if (!manifest) {
      reasons.push(REASON_CURRENT_MANIFEST_MISSING);
      statuses.push("blocked");
    } else {
      const verification = await verifyRelease(manifest, releaseDir(releaseRoot, pointer.releaseId));
      if (verification.issues.some((i) => i.severity === "error")) {
        reasons.push(REASON_CURRENT_RELEASE_FAILED_VERIFICATION);
        statuses.push("blocked");
      }
    }
  }

  const lock = await readLock(releaseRoot);
  if (lock) {
    reasons.push(REASON_LOCK_HELD);
    statuses.push("warning");
  }

  return { status: worstOf(statuses), reasons, currentReleaseId: pointer?.releaseId, lockHeld: Boolean(lock) };
}

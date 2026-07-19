import { join } from "node:path";

// layout — the Release Platform's on-disk directory scheme, owned
// here since publisher/ is the module that actually creates these
// paths (promotion). Every other module (planner/, staging/,
// verification/, rollback/, locking/, health/) imports these path
// functions read-only, rather than each hard-coding the scheme itself
// — one place defines "where things go," matching Build Platform's
// own DEFAULT_OUT_DIR/MANIFEST_RELATIVE_PATH precedent.
//
//   <releaseRoot>/
//     releases/<releaseId>/            — one immutable directory per published release
//     releases/<releaseId>/RELEASE_MANIFEST.json
//     current.json                     — pointer to the live release
//     .staging/<releaseId>/            — isolated staging area before promotion
//     .lock                            — release lock file
//     reports/                         — RELEASE_REPORT.md, ROLLBACK_REPORT.md, DEPLOYMENT_HEALTH.md

export const DEFAULT_RELEASE_ROOT = "dist/release";
const RELEASE_MANIFEST_FILENAME = "RELEASE_MANIFEST.json";

export function releaseDir(releaseRoot: string, releaseId: string): string {
  return join(releaseRoot, "releases", releaseId);
}

export function releaseManifestPath(releaseRoot: string, releaseId: string): string {
  return join(releaseDir(releaseRoot, releaseId), RELEASE_MANIFEST_FILENAME);
}

export function currentPointerPath(releaseRoot: string): string {
  return join(releaseRoot, "current.json");
}

export function stagingDir(releaseRoot: string, releaseId: string): string {
  return join(releaseRoot, ".staging", releaseId);
}

export function lockFilePath(releaseRoot: string): string {
  return join(releaseRoot, ".lock");
}

export function reportsDir(releaseRoot: string): string {
  return join(releaseRoot, "reports");
}

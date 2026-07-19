import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { issue, makeResult, findDuplicates, type ValidationIssue, type ValidationResult } from "../../validators/shared";
import { scanDirectory } from "../planner/scanDirectory";
import type { ReleaseFileEntry, SourceBuildInfo } from "../planner/types";

// verifyRelease — every check this phase's VERIFICATION section names:
// checksums, artifact integrity, manifest integrity, build version,
// missing/unexpected/duplicate artifacts. Re-derives its own view of
// `checkDir` (via scanDirectory — Release Platform's own utility, not
// a call into Build Platform) rather than trusting `release.files`
// blindly — "never bypass verification" means this step independently
// confirms what's actually on disk, even though a plan or a published
// manifest already recorded what should be there.

/** The narrow shape verifyRelease() actually needs — satisfied structurally by both a fresh ReleasePlan (pre-publish) and an already-published ReleaseManifest (rollback/'s "integrity verification before rollback"), so this one function serves both call sites. */
export interface VerifiableRelease {
  files: ReleaseFileEntry[];
  build: SourceBuildInfo;
}

/** Build Platform manifest schema versions this Release Platform knows how to publish. Bumped only when a new BUILD_MANIFEST_SCHEMA_VERSION is verified compatible — see documentation/DEPLOYMENT_VERIFICATION.md. */
export const SUPPORTED_BUILD_SCHEMA_VERSIONS = ["1.0.0"];

function checkDuplicates(release: VerifiableRelease): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [path, group] of findDuplicates(release.files, (f) => f.path)) {
    issues.push(issue("error", "RELEASE_DUPLICATE_ARTIFACT", `${group.length} entries share path "${path}"`, path));
  }
  return issues;
}

function checkMissingAndUnexpected(release: VerifiableRelease, checkDir: string, actual: readonly ReleaseFileEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const actualByPath = new Map(actual.map((f) => [f.path, f.checksum]));
  const expectedPaths = new Set(release.files.map((f) => f.path));

  for (const expected of release.files) {
    const actualChecksum = actualByPath.get(expected.path);
    if (actualChecksum === undefined) {
      issues.push(issue("error", "RELEASE_MISSING_ARTIFACT", `Expected artifact "${expected.path}" is not present in "${checkDir}"`, expected.path));
    } else if (actualChecksum !== expected.checksum) {
      issues.push(issue("error", "RELEASE_CHECKSUM_MISMATCH", `Artifact "${expected.path}" checksum does not match the release record`, expected.path));
    }
  }
  for (const actualFile of actual) {
    if (!expectedPaths.has(actualFile.path)) {
      issues.push(issue("warning", "RELEASE_UNEXPECTED_ARTIFACT", `Artifact "${actualFile.path}" exists in "${checkDir}" but is not part of the release record`, actualFile.path));
    }
  }
  return issues;
}

async function checkArtifactIntegrity(checkDir: string, release: VerifiableRelease): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const file of release.files) {
    if (!file.path.endsWith(".json")) continue;
    try {
      JSON.parse(await readFile(join(checkDir, file.path), "utf-8"));
    } catch {
      issues.push(issue("error", "RELEASE_INVALID_JSON_ARTIFACT", `Artifact "${file.path}" claims .json but does not parse as valid JSON`, file.path));
    }
  }
  return issues;
}

function checkManifestIntegrity(release: VerifiableRelease): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!SUPPORTED_BUILD_SCHEMA_VERSIONS.includes(release.build.schemaVersion)) {
    issues.push(
      issue(
        "error",
        "RELEASE_UNSUPPORTED_BUILD_VERSION",
        `Build manifest schemaVersion "${release.build.schemaVersion}" is not in the supported set [${SUPPORTED_BUILD_SCHEMA_VERSIONS.join(", ")}]`,
        "build.schemaVersion",
      ),
    );
  }
  if (release.build.totalErrors > 0) {
    issues.push(issue("error", "RELEASE_SOURCE_BUILD_HAD_ERRORS", `Source build manifest reports ${release.build.totalErrors} error(s) — Build Platform should never have produced this output`, "build.totalErrors"));
  }
  if (release.build.invalidPages > 0) {
    issues.push(issue("error", "RELEASE_SOURCE_BUILD_HAD_INVALID_PAGES", `Source build manifest reports ${release.build.invalidPages} invalid page(s)`, "build.invalidPages"));
  }
  return issues;
}

export async function verifyRelease(release: VerifiableRelease, checkDir: string): Promise<ValidationResult> {
  const actual = await scanDirectory(checkDir);
  const issues: ValidationIssue[] = [
    ...checkDuplicates(release),
    ...checkMissingAndUnexpected(release, checkDir, actual),
    ...(await checkArtifactIntegrity(checkDir, release)),
    ...checkManifestIntegrity(release),
  ];
  return makeResult("verifyRelease", issues);
}

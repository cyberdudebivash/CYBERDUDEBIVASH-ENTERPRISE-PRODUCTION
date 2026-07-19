// Owns: the Release Platform's own plan and manifest shapes. A
// ReleasePlan is computed by diffing a fresh scan of the Build
// Platform's output directory against the currently published
// release's own recorded file list — never against Build Platform's
// code, only against files it already wrote to disk. A ReleaseManifest
// is the durable record of one published release, written once by the
// publisher (see publisher/) and read back by every later planner run,
// by rollback/, and by health/.

/** One file's path (relative to its own root — sourceDir for a scan, a release directory for a published manifest) and content checksum. */
export interface ReleaseFileEntry {
  path: string;
  checksum: string;
}

/** Defined here (a leaf, dependency-free module) rather than alongside runRelease() itself, since reports/ needs this type and must not import the top-level orchestrator (which itself imports reports/) — see runRelease.ts. */
export type ReleaseMode = "full" | "incremental" | "preview" | "dry-run";

/** The build-manifest.json fields this platform actually reads — a narrow, type-only view (see planner/readBuildManifest.ts), not a re-declaration of Build Platform's own BuildManifest type. */
export interface SourceBuildInfo {
  schemaVersion: string;
  mode: string;
  generatedAt: string;
  totalErrors: number;
  totalWarnings: number;
  invalidPages: number;
}

/**
 * A deterministic, filesystem-mutation-free plan: given the same
 * source scan and the same previously-published release, always
 * produces the same plan. `releaseId` is a pure content hash (see
 * planner/computeReleaseId.ts) — publishing identical content twice
 * produces the identical release id, which is a deliberate,
 * idempotency-supporting property, not a bug (see RELEASE_FLOW.md).
 */
export interface ReleasePlan {
  releaseId: string;
  createdAt: string;
  sourceDir: string;
  previousReleaseId: string | undefined;
  build: SourceBuildInfo;
  filesAdded: ReleaseFileEntry[];
  filesUpdated: ReleaseFileEntry[];
  filesRemoved: string[];
  filesUnchanged: ReleaseFileEntry[];
  /** Every file this release would publish, path -> checksum — the source of truth staging/verification/publisher all key off. */
  files: ReleaseFileEntry[];
}

/** The durable record of one published release — written by publisher/ into `releases/<releaseId>/RELEASE_MANIFEST.json`, read back by planner/ (to diff the next release), rollback/, and health/. */
export interface ReleaseManifest {
  releaseId: string;
  createdAt: string;
  publishedAt: string;
  sourceDir: string;
  /** The release that was live immediately before this one was published — `undefined` for the very first release ever published. Lets rollback/ walk release history without needing an external plan. */
  previousReleaseId: string | undefined;
  build: SourceBuildInfo;
  files: ReleaseFileEntry[];
}

/** `dist/release/current.json` — the pointer to the currently live release. */
export interface CurrentReleasePointer {
  releaseId: string;
  publishedAt: string;
}

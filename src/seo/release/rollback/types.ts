import type { ValidationIssue } from "../../validators/shared";

export type RollbackTarget = "latest" | { releaseId: string };

/** The durable record of one rollback — written to `reports/` alongside RELEASE_MANIFEST.json's own history, distinct from any single release's own manifest. */
export interface RollbackManifest {
  fromReleaseId: string | undefined;
  toReleaseId: string;
  rolledBackAt: string;
  dryRun: boolean;
  verificationIssues: ValidationIssue[];
}

export type ReleaseHealthStatus = "healthy" | "warning" | "blocked";

export interface ReleaseHealthReport {
  status: ReleaseHealthStatus;
  /** Deterministic, stable strings — the same underlying condition always produces the same reason text, so a caller (or a test) can assert on membership rather than parsing free-form prose. */
  reasons: string[];
  currentReleaseId: string | undefined;
  lockHeld: boolean;
}

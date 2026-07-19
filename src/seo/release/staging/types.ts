export type StagingMode = "full" | "incremental";

export interface StagingResult {
  stagingDir: string;
  copiedPaths: string[];
  linkedPaths: string[];
}

import { checksumOf } from "../manifests/checksum";
import type { BuildManifest } from "../manifests/types";
import type { PageGenerationResult } from "./generatePage";

// incrementalBuild — partitions an already-generated site (every page
// re-run through the Runtime API, which is cheap and fully
// deterministic — see runtime/documentation/PIPELINE_ARCHITECTURE.md)
// into pages whose artifact content changed since the previous build
// and pages that didn't. "Incremental" here means "skip redundant disk
// writes," not "skip redundant computation": recomputing every page's
// artifacts is inexpensive and guarantees correctness even if the
// previous manifest is stale or was produced by different code; only
// the write is actually redundant for an unchanged page.

export interface IncrementalPartition {
  changed: PageGenerationResult[];
  unchanged: PageGenerationResult[];
}

export function partitionForIncrementalBuild(pages: readonly PageGenerationResult[], previousManifest: BuildManifest | undefined): IncrementalPartition {
  if (!previousManifest) return { changed: [...pages], unchanged: [] };

  const previousChecksums = new Map(previousManifest.pages.map((entry) => [entry.pageId, entry.checksum]));

  const changed: PageGenerationResult[] = [];
  const unchanged: PageGenerationResult[] = [];
  for (const page of pages) {
    const checksum = checksumOf(page.artifacts);
    if (previousChecksums.get(page.pageId) === checksum) unchanged.push(page);
    else changed.push(page);
  }
  return { changed, unchanged };
}

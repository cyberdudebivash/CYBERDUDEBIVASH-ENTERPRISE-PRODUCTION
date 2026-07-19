import { createHash } from "node:crypto";
import type { ReleaseFileEntry } from "./types";

// computeReleaseId — a pure content hash over every file's (path,
// checksum) pair, sorted by path for order-independence. Deliberately
// carries NO timestamp: publishing the identical file set twice
// produces the identical release id, an idempotency property real
// content-addressed release systems rely on (republishing unchanged
// content is a verifiable no-op, not a new, indistinguishable
// history entry) — see RELEASE_FLOW.md.

const RELEASE_ID_PREFIX = "rel-";
const RELEASE_ID_HASH_LENGTH = 16;

export function computeReleaseId(files: readonly ReleaseFileEntry[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const fingerprint = sorted.map((f) => `${f.path}:${f.checksum}`).join("\n");
  const hash = createHash("sha256").update(fingerprint).digest("hex").slice(0, RELEASE_ID_HASH_LENGTH);
  return `${RELEASE_ID_PREFIX}${hash}`;
}

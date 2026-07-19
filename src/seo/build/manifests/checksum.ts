import { createHash } from "node:crypto";

// checksum — a deterministic sha256 over a value's JSON serialization.
// Every artifact builder in artifacts/ constructs its output object
// with the same field order on every call (plain object literals, no
// Map/Set iteration), so JSON.stringify is stable across runs given
// the same input — verified directly by
// tests/checksum.test.ts's "same input twice -> same checksum" case.

export function checksumOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

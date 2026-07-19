import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { lockFilePath } from "../publisher/layout";
import { ReleaseLockError } from "./errors";
import type { ReleaseLock, ReleaseLockInfo } from "./types";

// releaseLock — a single file-based lock guarding `releaseRoot`
// against concurrent releases and partial publishes ("Prevent:
// Concurrent releases, Partial publishes, Interrupted writes").
// Acquisition uses `open(path, "wx")` — an atomic exclusive create
// that fails if the file already exists — rather than a
// check-then-create race. Release verifies its own `token` still
// matches what's on disk before deleting, so a lock recovered by a
// second process (see recoverStaleLock) can never be released out
// from under it by the first process waking up late.

const DEFAULT_STALE_AFTER_MS = 10 * 60 * 1000;

// `>=`, not `>`: `acquiredAt`/`Date.now()` share millisecond resolution,
// so a lock checked for staleness in the same millisecond it was
// acquired has an elapsed age of exactly 0ms. With a strict `>`, a
// caller using `staleAfterMs = 0` to mean "treat as immediately stale"
// (recoverStaleLock's own tests do this) would flakily see that lock
// as still fresh whenever both timestamps land in the same
// millisecond — a real, timing-dependent bug this phase's own test
// suite caught. `>=` makes "0ms allowance" reliably mean "stale from
// the instant it's held," matching the caller's actual intent.
function isStale(info: ReleaseLockInfo, staleAfterMs: number): boolean {
  return Date.now() - new Date(info.acquiredAt).getTime() >= staleAfterMs;
}

export async function readLock(releaseRoot: string): Promise<ReleaseLockInfo | undefined> {
  try {
    return JSON.parse(await readFile(lockFilePath(releaseRoot), "utf-8")) as ReleaseLockInfo;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Force-removes the lock file if (and only if) it is currently stale. Returns whether it recovered anything — a no-op, not an error, when the lock is absent or still fresh. */
export async function recoverStaleLock(releaseRoot: string, staleAfterMs: number = DEFAULT_STALE_AFTER_MS): Promise<boolean> {
  const existing = await readLock(releaseRoot);
  if (!existing || !isStale(existing, staleAfterMs)) return false;
  await rm(lockFilePath(releaseRoot), { force: true });
  return true;
}

export async function acquireLock(releaseRoot: string, staleAfterMs: number = DEFAULT_STALE_AFTER_MS): Promise<ReleaseLock> {
  await mkdir(dirname(lockFilePath(releaseRoot)), { recursive: true });
  await recoverStaleLock(releaseRoot, staleAfterMs);

  const info: ReleaseLockInfo = { pid: process.pid, hostname: hostname(), acquiredAt: new Date().toISOString(), token: randomBytes(16).toString("hex") };
  try {
    const handle = await open(lockFilePath(releaseRoot), "wx");
    try {
      await handle.writeFile(JSON.stringify(info, null, 2));
    } finally {
      await handle.close();
    }
    return { releaseRoot, info };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const holder = await readLock(releaseRoot);
      throw new ReleaseLockError(`acquireLock: a release is already in progress (pid ${holder?.pid ?? "unknown"} on ${holder?.hostname ?? "unknown"}, acquired ${holder?.acquiredAt ?? "unknown"})`);
    }
    throw error;
  }
}

/** Releases `lock` only if the lock file on disk still carries the same token this call acquired — never blindly deletes whatever lock file happens to be present. */
export async function releaseLock(lock: ReleaseLock): Promise<void> {
  const current = await readLock(lock.releaseRoot);
  if (current?.token === lock.info.token) {
    await rm(lockFilePath(lock.releaseRoot), { force: true });
  }
}

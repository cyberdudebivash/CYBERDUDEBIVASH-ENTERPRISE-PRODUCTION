// Owns: the release lock's own shape. One lock file
// (`dist/release/.lock`) at a time guards the entire release root
// against concurrent releases and partial publishes — see
// documentation/LOCKING_STRATEGY.md.

export interface ReleaseLockInfo {
  pid: number;
  hostname: string;
  acquiredAt: string;
  /** A random token unique to this specific acquisition — releaseLock() only removes the lock file if its own token still matches what's on disk, so a stale lock recovered by a second process can never be released out from under it by the first. */
  token: string;
}

export interface ReleaseLock {
  releaseRoot: string;
  info: ReleaseLockInfo;
}

# Locking Strategy

`locking/releaseLock.ts` guards `dist/release/` against concurrent
releases, partial publishes, and interrupted writes — this phase's own
LOCKING section requirement — with a single file-based lock.

## Acquisition is atomic

```ts
const handle = await open(lockFilePath(releaseRoot), "wx");
```

Node's `"wx"` flag opens for writing and **fails if the file already
exists** — this is an atomic exclusive-create at the filesystem level,
not a "check if it exists, then create" race (which would have a
window between the check and the create where two processes could both
proceed). Whichever process's `open()` call wins holds the lock;
the other observes `EEXIST` and receives a typed `ReleaseLockError`.

## Lock contents and the release token

```ts
interface ReleaseLockInfo {
  pid: number;
  hostname: string;
  acquiredAt: string;
  token: string; // random, unique per acquisition
}
```

`releaseLock(lock)` (releasing, not acquiring — see naming note below)
only removes the lock file if the `token` currently on disk still
matches the one this specific `acquireLock()` call received. This
guards a real race: if process A's lock goes stale and process B
recovers and re-acquires it (see below), and *then* process A finally
gets around to calling `releaseLock()` on its own now-stale reference,
A's call must not delete B's active lock. Verified directly:
`tests/locking.test.ts`'s "never removes a lock it doesn't own" test.

*(Naming note: `releaseLock()` the function releases a lock; a
"release" the noun — a published deployment — is this platform's other
central concept. The two uses of "release" are unrelated; each
function/type name here disambiguates by context, e.g. `ReleaseLock`
vs. `ReleaseManifest`.)*

## Staleness and recovery

```ts
acquireLock(releaseRoot, staleAfterMs = 10 * 60 * 1000)
```

Before attempting to create the lock file, `acquireLock()` calls
`recoverStaleLock()`, which force-removes an existing lock **only** if
its `acquiredAt` is older than `staleAfterMs` (default 10 minutes) —
covering "Interrupted writes": a process that crashed or was killed
mid-release leaves its lock behind forever otherwise. A fresh (recently
acquired) lock is left alone; `recoverStaleLock()` is a no-op in that
case, and the subsequent `open(..., "wx")` correctly fails with
`ReleaseLockError`. `recoverStaleLock()` is also exported standalone
for an operator (or a future CLI) to manually check/clear a stuck lock
without going through a full `acquireLock()` call.

## What's NOT covered

This is a **single-host** lock: `open(path, "wx")` is atomic on one
filesystem, but provides no cross-machine guarantee over, say, a
network filesystem with eventual-consistency semantics, or multiple
CI runners writing to logically-the-same `releaseRoot` through
different mounts. This phase's real deployment target — one release
process operating on one local `dist/release/` — doesn't need more
than this; a future multi-host CI/CD phase would need a real
distributed lock (a database row with a conditional update, a cloud
storage bucket's conditional-write API, etc.), which is a different
`ReleaseLockProvider`-shaped abstraction this module doesn't currently
offer (unlike Runtime's `RuntimeCacheProvider` — no analogous
abstraction was requested by this phase's own LOCKING section, and
none was added speculatively). See `RELEASE_PLATFORM.md`'s Known
Risks.

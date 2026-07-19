import { test } from "node:test";
import assert from "node:assert/strict";
import { acquireLock, releaseLock, readLock, recoverStaleLock } from "../locking/releaseLock";
import { ReleaseLockError } from "../locking/errors";
import { withTempDirs } from "./testHelpers";

test("acquireLock: succeeds when no lock is held, and readLock reflects it", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const lock = await acquireLock(releaseRoot);
    const info = await readLock(releaseRoot);
    assert.equal(info?.token, lock.info.token);
    await releaseLock(lock);
  });
});

test("acquireLock: a second acquisition while the first is held throws ReleaseLockError", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const lock = await acquireLock(releaseRoot);
    await assert.rejects(() => acquireLock(releaseRoot), ReleaseLockError);
    await releaseLock(lock);
  });
});

test("releaseLock: removes the lock file so a subsequent acquisition succeeds", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const lock = await acquireLock(releaseRoot);
    await releaseLock(lock);
    assert.equal(await readLock(releaseRoot), undefined);
    const second = await acquireLock(releaseRoot);
    await releaseLock(second);
  });
});

test("releaseLock: never removes a lock it doesn't own (token mismatch)", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const first = await acquireLock(releaseRoot);
    // Simulate a stale reference to a lock that was already recovered and re-acquired by someone else.
    await recoverStaleLock(releaseRoot, 0);
    const second = await acquireLock(releaseRoot);
    await releaseLock(first); // stale token — must not touch `second`'s lock
    assert.notEqual(await readLock(releaseRoot), undefined);
    await releaseLock(second);
  });
});

test("recoverStaleLock: does nothing when no lock exists", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    assert.equal(await recoverStaleLock(releaseRoot), false);
  });
});

test("recoverStaleLock: does nothing when the lock is fresh", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    const lock = await acquireLock(releaseRoot);
    assert.equal(await recoverStaleLock(releaseRoot, 10 * 60 * 1000), false);
    await releaseLock(lock);
  });
});

test("recoverStaleLock: removes a lock older than staleAfterMs", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    await acquireLock(releaseRoot);
    const recovered = await recoverStaleLock(releaseRoot, 0);
    assert.equal(recovered, true);
    assert.equal(await readLock(releaseRoot), undefined);
  });
});

test("acquireLock: automatically recovers a stale lock rather than throwing", async () => {
  await withTempDirs(async ({ releaseRoot }) => {
    await acquireLock(releaseRoot, 0); // acquired, immediately stale under a 0ms threshold
    const second = await acquireLock(releaseRoot, 0);
    await releaseLock(second);
  });
});

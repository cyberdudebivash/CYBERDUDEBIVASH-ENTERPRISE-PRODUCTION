import { describe, expect, it } from "vitest";
import { D1Adapter } from "@auth/d1-adapter";
import { createTestD1Factory } from "../repositories/testUtils/testD1.js";

/**
 * RC1 Workstream 9: a contract test for @auth/d1-adapter's own CRUD
 * operations against migrations/0001_authjs_core.sql — not this codebase's
 * logic (the adapter is a third-party package), but the *schema
 * compatibility* between that migration file and what the adapter's real
 * queries.ts actually issues. auth/config.test.ts and router.test.ts's
 * /api/auth/session tests already exercise the adapter indirectly through
 * Auth() — this exercises it directly, covering adapter methods
 * (linkAccount, getUserByAccount, session CRUD) those tests never reach.
 */
const createDb = await createTestD1Factory();

describe("@auth/d1-adapter against migrations/0001_authjs_core.sql", () => {
  it("creates a user and reads it back by id and by email", async () => {
    const adapter = D1Adapter(createDb());
    const created = await adapter.createUser!({
      name: "Asha Rao",
      email: "asha@acme.in",
      emailVerified: null,
    } as never);

    expect(created.id).toBeTruthy();
    expect(await adapter.getUser!(created.id)).toMatchObject({ email: "asha@acme.in" });
    expect(await adapter.getUserByEmail!("asha@acme.in")).toMatchObject({ id: created.id });
  });

  it("links an OAuth account and finds the user by (provider, providerAccountId)", async () => {
    const adapter = D1Adapter(createDb());
    const user = await adapter.createUser!({
      name: "Asha Rao",
      email: "asha@acme.in",
      emailVerified: null,
    } as never);

    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "google-user-123",
    } as never);

    const found = await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: "google-user-123",
    });
    expect(found).toMatchObject({ id: user.id });
  });

  it("creates a session and reads it back joined with its user", async () => {
    const adapter = D1Adapter(createDb());
    const user = await adapter.createUser!({
      name: "Asha Rao",
      email: "asha@acme.in",
      emailVerified: null,
    } as never);

    const expires = new Date("2026-08-19T00:00:00.000Z");
    await adapter.createSession!({ sessionToken: "session-token-1", userId: user.id, expires });

    const result = await adapter.getSessionAndUser!("session-token-1");
    expect(result?.user).toMatchObject({ id: user.id });
    expect(result?.session).toMatchObject({ userId: user.id });
  });

  it("returns null for a session token that was deleted", async () => {
    const adapter = D1Adapter(createDb());
    const user = await adapter.createUser!({
      name: "Asha Rao",
      email: "asha@acme.in",
      emailVerified: null,
    } as never);
    await adapter.createSession!({
      sessionToken: "session-token-2",
      userId: user.id,
      expires: new Date("2026-08-19T00:00:00.000Z"),
    });

    await adapter.deleteSession!("session-token-2");

    expect(await adapter.getSessionAndUser!("session-token-2")).toBeNull();
  });

  it("deleting a user also removes their sessions and linked accounts", async () => {
    const adapter = D1Adapter(createDb());
    const user = await adapter.createUser!({
      name: "Asha Rao",
      email: "asha@acme.in",
      emailVerified: null,
    } as never);
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "google-user-123",
    } as never);
    await adapter.createSession!({
      sessionToken: "session-token-3",
      userId: user.id,
      expires: new Date("2026-08-19T00:00:00.000Z"),
    });

    await adapter.deleteUser!(user.id);

    expect(await adapter.getUser!(user.id)).toBeNull();
    expect(await adapter.getSessionAndUser!("session-token-3")).toBeNull();
    expect(
      await adapter.getUserByAccount!({ provider: "google", providerAccountId: "google-user-123" }),
    ).toBeNull();
  });
});

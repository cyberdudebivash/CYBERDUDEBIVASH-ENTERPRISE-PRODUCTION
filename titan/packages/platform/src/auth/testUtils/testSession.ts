import type { AuthConfig } from "@auth/core";

export interface TestCaller {
  userId: string;
  /** A `Cookie` header value carrying a real session token — pass as
   * `headers: { cookie }` on a test `Request` to authenticate it. */
  cookie: string;
}

/**
 * Security Release Blocker Sprint: creates a real user and a real session
 * row via the same `@auth/d1-adapter` the Worker uses in production
 * (`deps.authConfig.adapter`), then returns a `Cookie` header that resolves
 * back to that session through the actual `getSession`/`Auth()` flow — not
 * a mocked session object standing in for one. Matches this package's own
 * testing discipline elsewhere (real sql.js D1, real Auth.js calls in
 * router.test.ts's `/api/auth/*` suite) rather than introducing a
 * test-only bypass into router.ts.
 *
 * The `__Secure-` cookie name prefix is not a guess: @auth/core's
 * `useSecureCookies` defaults to `url.protocol === "https:"`
 * (lib/init.js), and every test `Request` in this package uses
 * `https://example.com` URLs, so the real cookie Auth.js expects here
 * always carries that prefix — confirmed by probing `getSession` directly
 * with and without it before writing this helper.
 */
export async function createTestCaller(
  authConfig: AuthConfig,
  overrides: { name?: string; email?: string } = {},
): Promise<TestCaller> {
  const adapter = authConfig.adapter;
  if (!adapter?.createUser || !adapter.createSession) {
    throw new Error("createTestCaller requires an authConfig with a real adapter");
  }

  const unique = crypto.randomUUID();
  const user = await adapter.createUser({
    name: overrides.name ?? "Test User",
    email: overrides.email ?? `test-${unique}@example.com`,
    emailVerified: null,
  } as never);

  const sessionToken = `test-session-${unique}`;
  await adapter.createSession({
    sessionToken,
    userId: user.id,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return { userId: user.id, cookie: `__Secure-authjs.session-token=${sessionToken}` };
}

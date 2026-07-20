import { describe, expect, it } from "vitest";
import type { UserProfileRecord } from "../repositories/types.js";
import { requireOrganizationAccess } from "./authorize.js";

function makeProfile(overrides: Partial<UserProfileRecord> = {}): UserProfileRecord {
  return {
    id: "profile_1",
    userId: "user_1",
    organizationId: "org_1",
    role: "member",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("requireOrganizationAccess", () => {
  it("returns null (proceed) when the caller's role meets the minimum", () => {
    const profiles = [makeProfile({ role: "admin" })];
    expect(requireOrganizationAccess(profiles, "org_1", "member", "req-1")).toBeNull();
  });

  it("returns a 403 Response when the caller's role is below the minimum", async () => {
    const profiles = [makeProfile({ role: "member" })];
    const response = requireOrganizationAccess(profiles, "org_1", "owner", "req-1");
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
    expect(await response!.json()).toMatchObject({
      error: { code: "forbidden" },
      requestId: "req-1",
    });
  });

  it("returns a 403 Response when the caller has no membership in that organization at all", () => {
    const profiles = [makeProfile({ organizationId: "org_1", role: "owner" })];
    const response = requireOrganizationAccess(profiles, "org_2", "member", "req-1");
    expect(response?.status).toBe(403);
  });

  it("demonstrates the intended call-site pattern: short-circuit before touching business logic", async () => {
    // A stand-in for a future protected route handler — proves the
    // short-circuit shape actually composes the way router.ts's real
    // handlers do (early-return a Response, or fall through to real work).
    function hypotheticalProtectedHandler(
      profiles: UserProfileRecord[],
      organizationId: string,
    ): Response {
      const denied = requireOrganizationAccess(profiles, organizationId, "admin", "req-2");
      if (denied) return denied;
      return Response.json({ ok: true });
    }

    const deniedResponse = hypotheticalProtectedHandler([makeProfile({ role: "member" })], "org_1");
    expect(deniedResponse.status).toBe(403);

    const allowedResponse = hypotheticalProtectedHandler([makeProfile({ role: "admin" })], "org_1");
    expect(await allowedResponse.json()).toEqual({ ok: true });
  });
});

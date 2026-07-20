import { describe, expect, it } from "vitest";
import type { UserProfileRecord } from "../repositories/types.js";
import {
  canAccessOrganization,
  findProfileForOrganization,
  hasAtLeastRole,
  isPlatformAdministrator,
} from "./rbac.js";

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

describe("hasAtLeastRole", () => {
  it("ranks owner above admin above member", () => {
    expect(hasAtLeastRole("owner", "admin")).toBe(true);
    expect(hasAtLeastRole("admin", "owner")).toBe(false);
    expect(hasAtLeastRole("member", "member")).toBe(true);
    expect(hasAtLeastRole("admin", "member")).toBe(true);
  });
});

describe("findProfileForOrganization", () => {
  it("finds the profile matching the given organization", () => {
    const profiles = [
      makeProfile({ organizationId: "org_1" }),
      makeProfile({ organizationId: "org_2" }),
    ];
    expect(findProfileForOrganization(profiles, "org_2")?.organizationId).toBe("org_2");
  });

  it("returns null when the user has no profile in that organization", () => {
    const profiles = [makeProfile({ organizationId: "org_1" })];
    expect(findProfileForOrganization(profiles, "org_9")).toBeNull();
  });
});

describe("canAccessOrganization", () => {
  it("grants access when the user's role meets the minimum", () => {
    const profiles = [makeProfile({ role: "admin" })];
    expect(canAccessOrganization(profiles, "org_1", "member")).toBe(true);
    expect(canAccessOrganization(profiles, "org_1", "admin")).toBe(true);
  });

  it("denies access when the user's role is below the minimum", () => {
    const profiles = [makeProfile({ role: "member" })];
    expect(canAccessOrganization(profiles, "org_1", "owner")).toBe(false);
  });

  it("denies access when the user has no membership in that organization", () => {
    const profiles = [makeProfile({ organizationId: "org_1", role: "owner" })];
    expect(canAccessOrganization(profiles, "org_2", "member")).toBe(false);
  });
});

describe("isPlatformAdministrator", () => {
  it("grants platform-administrator status for an organizationId: null, role: owner profile", () => {
    const profiles = [makeProfile({ organizationId: null, role: "owner" })];
    expect(isPlatformAdministrator(profiles)).toBe(true);
  });

  it("denies it for a null-organization profile below owner", () => {
    const profiles = [makeProfile({ organizationId: null, role: "admin" })];
    expect(isPlatformAdministrator(profiles)).toBe(false);
  });

  it("denies it for an owner role that is scoped to a real organization", () => {
    const profiles = [makeProfile({ organizationId: "org_1", role: "owner" })];
    expect(isPlatformAdministrator(profiles)).toBe(false);
  });

  it("recognizes it alongside other, organization-scoped profiles for the same user", () => {
    const profiles = [
      makeProfile({ organizationId: "org_1", role: "member" }),
      makeProfile({ organizationId: null, role: "owner" }),
    ];
    expect(isPlatformAdministrator(profiles)).toBe(true);
  });

  it("denies it for an empty profile list", () => {
    expect(isPlatformAdministrator([])).toBe(false);
  });
});

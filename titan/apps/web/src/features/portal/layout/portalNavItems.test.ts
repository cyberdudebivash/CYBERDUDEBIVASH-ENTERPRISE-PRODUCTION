import { describe, expect, it } from "vitest";
import { hasPortalOrganizationMembership, portalNavItems } from "./portalNavItems.js";

const memberMe = {
  userId: "u1",
  email: "member@acme.in",
  profiles: [
    {
      organizationId: "org_1",
      role: "member" as const,
      id: "p1",
      createdAt: "2026-07-20T00:00:00.000Z",
      userId: "u1",
    },
  ],
  isPlatformAdministrator: false,
};

const noMembershipMe = {
  userId: "u2",
  email: "nobody@acme.in",
  profiles: [],
  isPlatformAdministrator: false,
};

const platformAdminOnlyMe = {
  userId: "u3",
  email: "admin@acme.in",
  profiles: [
    {
      organizationId: null,
      role: "owner" as const,
      id: "p2",
      createdAt: "2026-07-20T00:00:00.000Z",
      userId: "u3",
    },
  ],
  isPlatformAdministrator: true,
};

describe("hasPortalOrganizationMembership", () => {
  it("is true for a real organization member", () => {
    expect(hasPortalOrganizationMembership(memberMe)).toBe(true);
  });

  it("is false for a caller with no profiles at all", () => {
    expect(hasPortalOrganizationMembership(noMembershipMe)).toBe(false);
  });

  it("is false for a Platform Administrator with only a platform-wide grant", () => {
    expect(hasPortalOrganizationMembership(platformAdminOnlyMe)).toBe(false);
  });
});

describe("portalNavItems", () => {
  it("includes every portal section for a real organization member", () => {
    const items = portalNavItems(memberMe);
    expect(items).toContainEqual({ label: "Dashboard", to: "/portal" });
    expect(items).toContainEqual({ label: "Assessments", to: "/portal/assessments" });
    expect(items).toContainEqual({ label: "Reports", to: "/portal/reports" });
    expect(items).toContainEqual({ label: "Support", to: "/portal/support" });
    expect(items).toContainEqual({ label: "Subscription", to: "/portal/subscription" });
    expect(items).toContainEqual({ label: "Account", to: "/portal/account" });
  });

  it("returns no items at all for a caller with no organization membership", () => {
    expect(portalNavItems(noMembershipMe)).toEqual([]);
    expect(portalNavItems(platformAdminOnlyMe)).toEqual([]);
  });
});

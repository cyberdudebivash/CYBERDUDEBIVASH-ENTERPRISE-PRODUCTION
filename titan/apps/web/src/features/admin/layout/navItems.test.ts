import { describe, expect, it } from "vitest";
import { adminNavItems } from "./navItems.js";

describe("adminNavItems", () => {
  it("always includes Dashboard", () => {
    const items = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(items).toContainEqual({ label: "Dashboard", to: "/admin" });
  });

  it("includes Leads (EAP-2) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Leads", to: "/admin/leads" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Leads", to: "/admin/leads" });
  });

  it("includes Assessments (EAP-3) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Assessments", to: "/admin/assessments" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Assessments", to: "/admin/assessments" });
  });

  it("includes Organizations (EAP-4) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Organizations", to: "/admin/organizations" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Organizations", to: "/admin/organizations" });
  });
});

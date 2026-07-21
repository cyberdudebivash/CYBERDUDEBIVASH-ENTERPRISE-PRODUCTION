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

  it("includes Users (EAP-5) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Users", to: "/admin/users" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Users", to: "/admin/users" });
  });

  it("includes Audit (EAP-6) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Audit", to: "/admin/audit" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Audit", to: "/admin/audit" });
  });

  it("includes Operations (EAP-7) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Operations", to: "/admin/operations" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Operations", to: "/admin/operations" });
  });

  it("includes Reporting (EAP-8) only for a Platform Administrator", () => {
    const admin = adminNavItems({
      userId: "u1",
      email: "a@x.com",
      profiles: [],
      isPlatformAdministrator: true,
    });
    expect(admin).toContainEqual({ label: "Reporting", to: "/admin/reporting" });

    const nonAdmin = adminNavItems({
      userId: "u2",
      email: "b@x.com",
      profiles: [],
      isPlatformAdministrator: false,
    });
    expect(nonAdmin).not.toContainEqual({ label: "Reporting", to: "/admin/reporting" });
  });
});

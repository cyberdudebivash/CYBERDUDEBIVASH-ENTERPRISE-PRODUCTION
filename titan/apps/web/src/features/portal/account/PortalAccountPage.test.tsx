import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortalAccountContent } from "./PortalAccountPage.js";

describe("PortalAccountPage", () => {
  it("renders the real signed-in email and organization role, and a real sign-out link", () => {
    render(
      <PortalAccountContent
        me={{
          userId: "user_1",
          email: "member@acme.in",
          profiles: [
            {
              id: "profile_1",
              userId: "user_1",
              organizationId: "org_1",
              role: "admin",
              createdAt: "2026-07-20T00:00:00.000Z",
            },
          ],
          isPlatformAdministrator: false,
        }}
      />,
    );

    expect(screen.getAllByText("member@acme.in", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/auth/signout"),
    );
  });

  it("renders honestly without a Role row for a caller with no organization membership", () => {
    render(
      <PortalAccountContent
        me={{
          userId: "user_2",
          email: "solo@acme.in",
          profiles: [],
          isPlatformAdministrator: false,
        }}
      />,
    );

    expect(screen.queryByText("Role")).not.toBeInTheDocument();
  });
});

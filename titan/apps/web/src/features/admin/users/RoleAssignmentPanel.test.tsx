import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { OrganizationRecord, UserProfileRecord } from "@titan/platform";
import { RoleAssignmentPanel } from "./RoleAssignmentPanel.js";

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

function makeOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: "org_1",
    name: "Acme Fintech",
    slug: "acme-fintech",
    status: "active",
    industry: null,
    region: null,
    tags: [],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("RoleAssignmentPanel", () => {
  it("shows an honest empty state when the user has no roles yet", () => {
    render(
      <RoleAssignmentPanel
        profiles={[]}
        organizations={[]}
        isSubmitting={false}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(
      screen.getByText("This user has no organization or platform roles yet."),
    ).toBeInTheDocument();
  });

  it("resolves an organization id to its real name, and labels a platform-wide grant distinctly", () => {
    render(
      <RoleAssignmentPanel
        profiles={[
          makeProfile({ id: "p1", organizationId: "org_1", role: "member" }),
          makeProfile({ id: "p2", organizationId: null, role: "owner" }),
        ]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    // "Acme Fintech" legitimately renders twice: the existing profile's own
    // org-name span, and the grant-form's organization dropdown option —
    // scoped to the former, same class of real dual-rendering this project
    // has hit before (DECISION_LOG.md's EAP-3/EAP-4 entries).
    expect(
      screen.getByText("Acme Fintech", { selector: ".titan-role-assignment__org-name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform-wide")).toBeInTheDocument();
    expect(screen.getByText("Platform Administrator")).toBeInTheDocument();
  });

  it("changes a role via its select and calls onChangeRole", async () => {
    const user = userEvent.setup();
    const onChangeRole = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentPanel
        profiles={[makeProfile()]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={onChangeRole}
        onRevoke={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Change role for Acme Fintech" }),
      "admin",
    );
    expect(onChangeRole).toHaveBeenCalledWith("profile_1", "admin");
  });

  it("revokes a role via its own Revoke button", async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentPanel
        profiles={[makeProfile()]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={onRevoke}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Revoke" }));
    expect(onRevoke).toHaveBeenCalledWith("profile_1");
  });

  it("grants a new role for a chosen organization via the grant form", async () => {
    const user = userEvent.setup();
    const onGrant = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentPanel
        profiles={[]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={onGrant}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Organization" }), "org_1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "admin");
    await user.click(screen.getByRole("button", { name: "Grant role" }));

    expect(onGrant).toHaveBeenCalledWith("org_1", "admin");
  });

  it("grants a platform-wide role when no organization is chosen", async () => {
    const user = userEvent.setup();
    const onGrant = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentPanel
        profiles={[]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={onGrant}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Grant role" }));
    expect(onGrant).toHaveBeenCalledWith(null, "member");
  });

  it("disables every control while a submission is in flight", () => {
    render(
      <RoleAssignmentPanel
        profiles={[makeProfile()]}
        organizations={[makeOrganization()]}
        isSubmitting={true}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Grant role" })).toBeDisabled();
  });

  it("shows a real error alert when the last change failed", () => {
    render(
      <RoleAssignmentPanel
        profiles={[]}
        organizations={[]}
        isSubmitting={false}
        submitError="Cannot change the role of the only remaining Platform Administrator"
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Cannot change the role of the only remaining Platform Administrator"),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <RoleAssignmentPanel
        profiles={[makeProfile()]}
        organizations={[makeOrganization()]}
        isSubmitting={false}
        submitError={null}
        onGrant={vi.fn()}
        onChangeRole={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

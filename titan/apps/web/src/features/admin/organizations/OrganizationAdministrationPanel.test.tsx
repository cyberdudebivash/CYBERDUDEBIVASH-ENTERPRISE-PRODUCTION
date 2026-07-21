import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { OrganizationRecord } from "@titan/platform";
import { OrganizationAdministrationPanel } from "./OrganizationAdministrationPanel.js";

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

describe("OrganizationAdministrationPanel", () => {
  it("commits a changed name on blur", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    const nameInput = screen.getByRole("textbox", { name: "Name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Financial");
    await user.tab();

    expect(onUpdate).toHaveBeenCalledWith({ name: "Acme Financial" });
  });

  it("does not call onUpdate on blur when the name is unchanged", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("textbox", { name: "Name" }));
    await user.tab();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("clears industry back to null when the field is emptied", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization({ industry: "Retail" })}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    const industryInput = screen.getByRole("textbox", { name: "Industry" });
    await user.clear(industryInput);
    await user.tab();
    expect(onUpdate).toHaveBeenCalledWith({ industry: null });
  });

  it("adds a tag via the text input and Add tag button", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Add a tag" }), "enterprise");
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    expect(onUpdate).toHaveBeenCalledWith({ tags: ["enterprise"] });
  });

  it("removes a tag via its own remove button", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization({ tags: ["enterprise", "smb"] })}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove tag enterprise" }));
    expect(onUpdate).toHaveBeenCalledWith({ tags: ["smb"] });
  });

  it("shows Archive for an active organization and calls onUpdate with status archived", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization({ status: "active" })}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(onUpdate).toHaveBeenCalledWith({ status: "archived" });
  });

  it("shows Restore for an archived organization and calls onUpdate with status active", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization({ status: "archived" })}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(onUpdate).toHaveBeenCalledWith({ status: "active" });
  });

  it("adds a note via the textarea and Add note button, and clears the textarea", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Add an internal note" });
    await user.type(textarea, "Renewed enterprise contract.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(onUpdate).toHaveBeenCalledWith({ note: "Renewed enterprise contract." });
    expect(textarea).toHaveValue("");
  });

  it("disables every control while a submission is in flight", () => {
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={true}
        submitError={null}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Archive" })).toBeDisabled();
  });

  it("shows a real error alert when the last update failed", () => {
    render(
      <OrganizationAdministrationPanel
        organization={makeOrganization()}
        isSubmitting={false}
        submitError="Could not reach the server."
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Could not reach the server.")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <OrganizationAdministrationPanel
        organization={makeOrganization({ tags: ["enterprise"] })}
        isSubmitting={false}
        submitError={null}
        onUpdate={vi.fn()}
      />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

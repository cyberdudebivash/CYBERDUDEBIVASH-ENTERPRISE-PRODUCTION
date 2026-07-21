import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { LeadRecord } from "@titan/platform";
import { LeadLifecyclePanel } from "./LeadLifecyclePanel.js";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: null,
    assessmentId: null,
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: {
      score: 0,
      riskLevel: "low",
      breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
      gaps: [],
      scoredQuestionCount: 12,
    },
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: null,
    tags: [],
    ...overrides,
  };
}

const me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true };

describe("LeadLifecyclePanel", () => {
  it("calls onUpdate with the new status when the Status select changes", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "qualified");
    expect(onUpdate).toHaveBeenCalledWith({ status: "qualified" });
  });

  it("shows 'Assign to me' when unassigned, and calls onUpdate with the caller's own id", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Assign to me" }));
    expect(onUpdate).toHaveBeenCalledWith({ assignedTo: "u1" });
  });

  it("shows 'Unassign' and the raw assignee when assigned to someone else", () => {
    render(
      <LeadLifecyclePanel
        lead={makeLead({ assignedTo: "user_99" })}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("user_99")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unassign" })).toBeInTheDocument();
  });

  it("adds a tag via the text input and Add tag button", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
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
      <LeadLifecyclePanel
        lead={makeLead({ tags: ["enterprise", "hot-lead"] })}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove tag enterprise" }));
    expect(onUpdate).toHaveBeenCalledWith({ tags: ["hot-lead"] });
  });

  it("adds a note via the textarea and Add note button, and clears the textarea", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={onUpdate}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Add an internal note" });
    await user.type(textarea, "Called, left voicemail.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(onUpdate).toHaveBeenCalledWith({ note: "Called, left voicemail." });
    expect(textarea).toHaveValue("");
  });

  it("disables every control while a submission is in flight", () => {
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
        isSubmitting={true}
        submitError={null}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Priority" })).toBeDisabled();
  });

  it("shows a real error alert when the last update failed", () => {
    render(
      <LeadLifecyclePanel
        lead={makeLead()}
        me={me}
        isSubmitting={false}
        submitError="Could not reach the server."
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Could not reach the server.")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <LeadLifecyclePanel
        lead={makeLead({ tags: ["enterprise"] })}
        me={me}
        isSubmitting={false}
        submitError={null}
        onUpdate={vi.fn()}
      />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuditEventRecord } from "@titan/platform";
import { OrganizationAuditPanel } from "./OrganizationAuditPanel.js";

function makeEvent(overrides: Partial<AuditEventRecord>): AuditEventRecord {
  return {
    id: "e1",
    actorId: "u1",
    organizationId: "org_1",
    action: "organization.created",
    entityType: "organization",
    entityId: "org_1",
    metadata: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("OrganizationAuditPanel", () => {
  it("renders a human-readable label for a known action", () => {
    render(<OrganizationAuditPanel events={[makeEvent({ action: "organization.archived" })]} />);
    expect(screen.getByText("Organization archived")).toBeInTheDocument();
  });

  it("falls back to the raw action string for an unrecognized action", () => {
    render(<OrganizationAuditPanel events={[makeEvent({ action: "some.future.action" })]} />);
    expect(screen.getByText("some.future.action")).toBeInTheDocument();
  });

  it("sorts entries newest first", () => {
    render(
      <OrganizationAuditPanel
        events={[
          makeEvent({
            id: "old",
            action: "organization.created",
            createdAt: "2026-07-19T00:00:00.000Z",
          }),
          makeEvent({
            id: "new",
            action: "organization.updated",
            createdAt: "2026-07-20T00:00:00.000Z",
          }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Organization details updated");
    expect(items[1]).toHaveTextContent("Organization created");
  });

  it("shows the shared Timeline empty state for no events", () => {
    render(<OrganizationAuditPanel events={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

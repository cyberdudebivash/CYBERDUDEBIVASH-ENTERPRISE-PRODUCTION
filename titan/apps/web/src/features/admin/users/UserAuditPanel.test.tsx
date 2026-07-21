import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuditEventRecord } from "@titan/platform";
import { UserAuditPanel } from "./UserAuditPanel.js";

function makeEvent(overrides: Partial<AuditEventRecord>): AuditEventRecord {
  return {
    id: "e1",
    actorId: "u1",
    organizationId: null,
    action: "user.viewed",
    entityType: "user",
    entityId: "user_1",
    metadata: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("UserAuditPanel", () => {
  it("renders a human-readable label for a known action", () => {
    render(<UserAuditPanel events={[makeEvent({ action: "user.role_granted" })]} />);
    expect(screen.getByText("Role granted")).toBeInTheDocument();
  });

  it("falls back to the raw action string for an unrecognized action", () => {
    render(<UserAuditPanel events={[makeEvent({ action: "some.future.action" })]} />);
    expect(screen.getByText("some.future.action")).toBeInTheDocument();
  });

  it("sorts entries newest first", () => {
    render(
      <UserAuditPanel
        events={[
          makeEvent({
            id: "old",
            action: "user.role_granted",
            createdAt: "2026-07-19T00:00:00.000Z",
          }),
          makeEvent({
            id: "new",
            action: "user.role_changed",
            createdAt: "2026-07-20T00:00:00.000Z",
          }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Role changed");
    expect(items[1]).toHaveTextContent("Role granted");
  });

  it("shows the shared Timeline empty state for no events", () => {
    render(<UserAuditPanel events={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

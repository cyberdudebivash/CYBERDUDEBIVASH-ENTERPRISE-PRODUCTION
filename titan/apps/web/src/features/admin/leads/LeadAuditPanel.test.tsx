import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuditEventRecord } from "@titan/platform";
import { LeadAuditPanel } from "./LeadAuditPanel.js";

function makeEvent(overrides: Partial<AuditEventRecord>): AuditEventRecord {
  return {
    id: "e1",
    actorId: "u1",
    organizationId: null,
    action: "lead.created",
    entityType: "lead",
    entityId: "lead_1",
    metadata: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("LeadAuditPanel", () => {
  it("renders a human-readable label for a known action", () => {
    render(<LeadAuditPanel events={[makeEvent({ action: "lead.viewed" })]} />);
    expect(screen.getByText("Lead viewed")).toBeInTheDocument();
  });

  it("falls back to the raw action string for an unrecognized action", () => {
    render(<LeadAuditPanel events={[makeEvent({ action: "some.future.action" })]} />);
    expect(screen.getByText("some.future.action")).toBeInTheDocument();
  });

  it("renders a note's real text as the entry's detail", () => {
    render(
      <LeadAuditPanel
        events={[
          makeEvent({ action: "lead.note_added", metadata: { note: "Called, left voicemail." } }),
        ]}
      />,
    );
    expect(screen.getByText("Called, left voicemail.")).toBeInTheDocument();
  });

  it("renders a from/to change, with 'unassigned' for a null value", () => {
    render(
      <LeadAuditPanel
        events={[makeEvent({ action: "lead.assigned", metadata: { from: null, to: "user_1" } })]}
      />,
    );
    expect(screen.getByText("unassigned → user_1")).toBeInTheDocument();
  });

  it("sorts entries newest first", () => {
    render(
      <LeadAuditPanel
        events={[
          makeEvent({ id: "old", action: "lead.created", createdAt: "2026-07-19T00:00:00.000Z" }),
          makeEvent({ id: "new", action: "lead.viewed", createdAt: "2026-07-20T00:00:00.000Z" }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Lead viewed");
    expect(items[1]).toHaveTextContent("Lead created");
  });

  it("shows the shared Timeline empty state for no events", () => {
    render(<LeadAuditPanel events={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuditEventRecord } from "@titan/platform";
import { AssessmentAuditPanel } from "./AssessmentAuditPanel.js";

function makeEvent(overrides: Partial<AuditEventRecord>): AuditEventRecord {
  return {
    id: "e1",
    actorId: "u1",
    organizationId: null,
    action: "assessment.created",
    entityType: "assessment",
    entityId: "assessment_1",
    metadata: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("AssessmentAuditPanel", () => {
  it("renders a human-readable label for a known action", () => {
    render(<AssessmentAuditPanel events={[makeEvent({ action: "assessment.viewed" })]} />);
    expect(screen.getByText("Assessment viewed")).toBeInTheDocument();
  });

  it("falls back to the raw action string for an unrecognized action", () => {
    render(<AssessmentAuditPanel events={[makeEvent({ action: "some.future.action" })]} />);
    expect(screen.getByText("some.future.action")).toBeInTheDocument();
  });

  it("sorts entries newest first", () => {
    render(
      <AssessmentAuditPanel
        events={[
          makeEvent({
            id: "old",
            action: "assessment.created",
            createdAt: "2026-07-19T00:00:00.000Z",
          }),
          makeEvent({
            id: "new",
            action: "assessment.viewed",
            createdAt: "2026-07-20T00:00:00.000Z",
          }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Assessment viewed");
    expect(items[1]).toHaveTextContent("Assessment created");
  });

  it("shows the shared Timeline empty state for no events", () => {
    render(<AssessmentAuditPanel events={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

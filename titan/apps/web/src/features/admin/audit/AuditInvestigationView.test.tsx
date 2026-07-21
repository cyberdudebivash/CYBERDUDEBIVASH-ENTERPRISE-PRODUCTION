import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AuditEventRecord } from "@titan/platform";
import { AuditInvestigationView } from "./AuditInvestigationView.js";

function makeEvent(overrides: Partial<AuditEventRecord> = {}): AuditEventRecord {
  return {
    id: "event-1",
    actorId: "user_1",
    organizationId: "org_1",
    action: "lead.created",
    entityType: "lead",
    entityId: "lead_1",
    metadata: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function renderView(events: AuditEventRecord[]) {
  return render(
    <MemoryRouter>
      <AuditInvestigationView events={events} />
    </MemoryRouter>,
  );
}

describe("AuditInvestigationView", () => {
  it("groups by entity by default", () => {
    renderView([makeEvent(), makeEvent({ id: "event-2", action: "lead.viewed" })]);
    expect(screen.getByText("Lead lead_1")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
  });

  it("regroups by actor when 'Actor' is chosen", async () => {
    const user = userEvent.setup();
    renderView([
      makeEvent({ actorId: "user_1" }),
      makeEvent({ id: "event-2", actorId: "user_2", entityId: "lead_2" }),
    ]);

    await user.click(screen.getByRole("button", { name: "Actor" }));

    expect(screen.getByText("Actor user_1")).toBeInTheDocument();
    expect(screen.getByText("Actor user_2")).toBeInTheDocument();
  });

  it("regroups by organization when 'Organization' is chosen, labeling a null organizationId as platform-level", async () => {
    const user = userEvent.setup();
    renderView([makeEvent({ organizationId: null })]);

    await user.click(screen.getByRole("button", { name: "Organization" }));

    expect(screen.getByText("Platform-level (no organization)")).toBeInTheDocument();
  });

  it("shows an honest empty state with no events", () => {
    renderView([]);
    expect(screen.getByText("No events to correlate on this page.")).toBeInTheDocument();
  });
});

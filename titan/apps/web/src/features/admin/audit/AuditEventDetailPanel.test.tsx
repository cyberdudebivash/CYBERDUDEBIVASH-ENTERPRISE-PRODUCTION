import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AuditEventRecord } from "@titan/platform";
import { AuditEventDetailPanel } from "./AuditEventDetailPanel.js";

function makeEvent(overrides: Partial<AuditEventRecord> = {}): AuditEventRecord {
  return {
    id: "event-1",
    actorId: "user_1",
    organizationId: "org_1",
    action: "lead.created",
    entityType: "lead",
    entityId: "lead_1",
    metadata: { source: "dpdp-scan" },
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function mockFetch(relatedEvents: AuditEventRecord[]) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(relatedEvents), { status: 200 }));
}

function renderPanel(event: AuditEventRecord, onClose = () => {}) {
  return render(
    <MemoryRouter>
      <AuditEventDetailPanel event={event} onClose={onClose} />
    </MemoryRouter>,
  );
}

describe("AuditEventDetailPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the action label, actor link, organization link, and raw metadata", async () => {
    mockFetch([makeEvent()]);
    const event = makeEvent();
    renderPanel(event);

    expect(screen.getByText("Lead created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "user_1" })).toHaveAttribute(
      "href",
      "/admin/users/user_1",
    );
    expect(screen.getByRole("link", { name: "org_1" })).toHaveAttribute(
      "href",
      "/admin/organizations/org_1",
    );
    expect(await screen.findByText(/"source": "dpdp-scan"/)).toBeInTheDocument();
  });

  it("shows an honest fallback for a null actor, organization, and metadata", async () => {
    mockFetch([]);
    renderPanel(makeEvent({ actorId: null, organizationId: null, metadata: null }));

    expect(screen.getByText("System / anonymous")).toBeInTheDocument();
    expect(await screen.findByText("No metadata recorded for this event.")).toBeInTheDocument();
  });

  it("does not claim request context that this event log doesn't capture", () => {
    mockFetch([]);
    renderPanel(makeEvent());
    expect(
      screen.getByText(
        "Not captured — this event log has no request id, IP, or user-agent column.",
      ),
    ).toBeInTheDocument();
  });

  it("fetches and renders related events for the same entity", async () => {
    mockFetch([makeEvent(), makeEvent({ id: "event-2", action: "lead.viewed" })]);
    renderPanel(makeEvent());

    expect(await screen.findByText("Lead viewed")).toBeInTheDocument();
    const requestedUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("entityType=lead");
    expect(requestedUrl).toContain("entityId=lead_1");
  });

  it("calls onClose when the Close button is clicked", async () => {
    mockFetch([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel(makeEvent(), onClose);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

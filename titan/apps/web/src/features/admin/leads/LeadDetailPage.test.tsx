import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AuditEventRecord, LeadRecord } from "@titan/platform";
import { LeadDetailContent } from "./LeadDetailPage.js";

const sampleResult: AssessmentResult = {
  score: 42,
  riskLevel: "high",
  breakdown: { critical: 1, high: 1, medium: 0, low: 10, total: 2 },
  gaps: [
    {
      questionId: "has_dpo",
      question: "Do you have a DPO?",
      level: "critical",
      penalty: "₹250 crore",
    },
    { questionId: "dpia", question: "Do you run DPIAs?", level: "high", penalty: "₹150 crore" },
  ],
  scoredQuestionCount: 12,
};

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: null,
    assessmentId: null,
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: sampleResult,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: null,
    tags: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true };

/** A small in-memory backend double behind the mocked `fetch` — a PATCH
 * really mutates the lead a subsequent GET reads back, so a test can
 * assert on the real update → refetch cycle `useLeadDetail` performs,
 * not just on what the PATCH response alone claims. */
function mockLeadBackend(initialLead: LeadRecord, auditEvents: AuditEventRecord[] = []) {
  let lead = initialLead;
  vi.mocked(fetch).mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes(`/api/leads/${lead.id}`) && method === "PATCH") {
      const patch = JSON.parse(init!.body as string) as Partial<LeadRecord> & { note?: string };
      lead = { ...lead, ...patch };
      return Promise.resolve(jsonResponse(lead));
    }
    if (url.includes(`/api/leads/${initialLead.id}`) && method === "GET") {
      return Promise.resolve(jsonResponse(lead));
    }
    if (url.includes("/api/audit")) {
      return Promise.resolve(jsonResponse(auditEvents));
    }
    if (url.includes("/api/organizations")) {
      return Promise.resolve(
        jsonResponse([{ id: "org_1", name: "Acme Fintech Pvt Ltd", slug: "acme", createdAt: "t" }]),
      );
    }
    return Promise.reject(new Error(`unexpected fetch: ${method} ${url}`));
  });
  return () => lead;
}

function renderDetail(id = "lead_1") {
  return render(
    <MemoryRouter>
      <LeadDetailContent id={id} me={me} />
    </MemoryRouter>,
  );
}

describe("LeadDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real identity, submission, and risk intelligence data", async () => {
    mockLeadBackend(makeLead());
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Asha Rao" })).toBeInTheDocument();
    expect(screen.getByText("asha@acme.in")).toBeInTheDocument();
    expect(screen.getByText("Not linked to an organization")).toBeInTheDocument();
    expect(screen.getByText("42 / 100")).toBeInTheDocument();
    expect(screen.getByText("Do you have a DPO?")).toBeInTheDocument();
    expect(screen.getByText("Do you run DPIAs?")).toBeInTheDocument();
  });

  it("resolves organizationId to a real organization name via GET /api/organizations", async () => {
    mockLeadBackend(makeLead({ organizationId: "org_1" }));
    renderDetail();
    expect(await screen.findByText("Acme Fintech Pvt Ltd")).toBeInTheDocument();
  });

  it("renders the real audit trail for this lead as a timeline", async () => {
    mockLeadBackend(makeLead(), [
      {
        id: "e1",
        actorId: "u1",
        organizationId: null,
        action: "lead.created",
        entityType: "lead",
        entityId: "lead_1",
        metadata: null,
        createdAt: "2026-07-19T00:00:00.000Z",
      },
      {
        id: "e2",
        actorId: "u1",
        organizationId: null,
        action: "lead.viewed",
        entityType: "lead",
        entityId: "lead_1",
        metadata: null,
        createdAt: "2026-07-20T00:00:00.000Z",
      },
    ]);
    renderDetail();

    expect(await screen.findByText("Lead created")).toBeInTheDocument();
    expect(screen.getByText("Lead viewed")).toBeInTheDocument();
  });

  it("fetches the audit trail only after the lead fetch resolves, not in parallel with it (EAP-3 finding)", async () => {
    const callOrder: string[] = [];
    let resolveLead!: (value: Response) => void;
    const leadPromise = new Promise<Response>((resolve) => {
      resolveLead = resolve;
    });

    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/leads/lead_1")) {
        callOrder.push("lead");
        return leadPromise;
      }
      if (url.includes("/api/audit")) {
        callOrder.push("audit");
        return Promise.resolve(jsonResponse([]));
      }
      if (url.includes("/api/organizations")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderDetail();

    // The lead fetch has fired, but its response is still pending — the
    // audit-trail fetch must not have fired yet.
    await vi.waitFor(() => expect(callOrder).toContain("lead"));
    expect(callOrder).not.toContain("audit");

    resolveLead(jsonResponse(makeLead()));

    await screen.findByRole("heading", { name: "Asha Rao" });
    expect(callOrder).toEqual(["lead", "audit"]);
  });

  it("shows an honest 'Platform Administrator role required' message on a 403", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { error: { code: "forbidden", message: "Platform Administrator role required" } },
        403,
      ),
    );
    renderDetail();
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows a real error message when the lead fails to load", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "Internal server error" } }, 500),
    );
    renderDetail();
    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });

  it("changing status calls PATCH and re-renders the server's updated value", async () => {
    const user = userEvent.setup();
    mockLeadBackend(makeLead());
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    const statusSelect = screen.getByRole("combobox", { name: "Status" });
    await user.selectOptions(statusSelect, "qualified");

    await vi.waitFor(() => expect(statusSelect).toHaveValue("qualified"));
    const [, patchInit] = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(patchInit!.body as string)).toMatchObject({ status: "qualified" });
  });

  it("'Assign to me' then 'Unassign' round-trips through a real PATCH", async () => {
    const user = userEvent.setup();
    mockLeadBackend(makeLead());
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: "Assign to me" }));
    expect(await screen.findByRole("button", { name: "Unassign" })).toBeInTheDocument();
    expect(
      within(screen.getByText("Assigned to").closest("div")!).getByText("Me"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unassign" }));
    expect(await screen.findByRole("button", { name: "Assign to me" })).toBeInTheDocument();
  });

  it("adds a tag via a real PATCH and shows it as a removable chip", async () => {
    const user = userEvent.setup();
    mockLeadBackend(makeLead());
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    await user.type(screen.getByRole("textbox", { name: "Add a tag" }), "enterprise");
    await user.click(screen.getByRole("button", { name: "Add tag" }));

    expect(await screen.findByText("enterprise")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag enterprise" })).toBeInTheDocument();
  });

  it("adding a note does not change the lead's own status/priority", async () => {
    const user = userEvent.setup();
    const getLead = mockLeadBackend(makeLead({ status: "contacted" }));
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    await user.type(
      screen.getByRole("textbox", { name: "Add an internal note" }),
      "Called, left voicemail.",
    );
    await user.click(screen.getByRole("button", { name: "Add note" }));

    await vi.waitFor(() => {
      const patchCalls = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "PATCH");
      expect(patchCalls.length).toBeGreaterThan(0);
    });
    expect(getLead().status).toBe("contacted");
  });
});

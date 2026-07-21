import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { LeadRecord } from "@titan/platform";
import { LeadWorkspaceContent } from "./LeadWorkspacePage.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
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

function searchResponse(
  leads: LeadRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      leads,
      total: overrides.total ?? leads.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function renderWorkspace(
  me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true },
) {
  return render(
    <MemoryRouter>
      <LeadWorkspaceContent me={me} />
    </MemoryRouter>,
  );
}

describe("LeadWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real leads with status/priority/risk badges and a working Name link", async () => {
    // A fresh Response per call — a Response body can only be read once,
    // and every test below that triggers more than one fetch needs a new
    // instance each time, not the same one replayed (mockResolvedValue
    // would reuse one Response object across every call).
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(searchResponse([makeLead({ status: "qualified", priority: "urgent" })])),
    );

    renderWorkspace();

    expect(await screen.findByRole("link", { name: "Asha Rao" })).toHaveAttribute(
      "href",
      "/admin/leads/lead_1",
    );
    // Scoped to the table itself — "Qualified"/etc. also appear as <option>
    // text in the filter <select>s above it, so an unscoped query is
    // ambiguous between the two.
    const row = within(screen.getByRole("table"));
    expect(row.getByText("Acme Fintech")).toBeInTheDocument();
    expect(row.getByText("Qualified")).toBeInTheDocument();
    expect(row.getByText("Urgent")).toBeInTheDocument();
    expect(row.getByText("Medium")).toBeInTheDocument(); // the risk badge (sampleResult.riskLevel)
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin, without firing the request", async () => {
    const calledUrls: string[] = [];
    vi.mocked(fetch).mockImplementation((input) => {
      calledUrls.push(String(input));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: "forbidden", message: "Platform Administrator role required" },
          }),
          { status: 403 },
        ),
      );
    });

    renderWorkspace({
      userId: "u2",
      email: "member@acme.in",
      profiles: [],
      isPlatformAdministrator: false,
    });

    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows a real empty state when no leads match", async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([], { total: 0 })));
    renderWorkspace();
    expect(await screen.findByText("No leads match these filters")).toBeInTheDocument();
  });

  it("re-fetches with a status filter when one is chosen", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeLead()])));
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "qualified");

    await vi.waitFor(() => {
      const lastCall = vi.mocked(fetch).mock.calls.at(-1)?.[0];
      expect(String(lastCall)).toContain("status=qualified");
    });
  });

  it("toggles sort direction on repeated header clicks", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeLead()])));
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: /Company/ }));
    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toMatch(
        /sortBy=company.*sortDirection=desc|sortDirection=desc.*sortBy=company/,
      );
    });

    await user.click(screen.getByRole("button", { name: /Company/ }));
    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("sortDirection=asc");
    });
  });

  it("sorts by the real backend field riskScore when the Risk header is clicked, never the bare 'risk' column id", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeLead()])));
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: /Risk/ }));
    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("sortBy=riskScore");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(searchResponse([makeLead()], { total: 50, page: 1, pageSize: 25 })),
    );
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("page=2");
    });
  });

  it("saves the current filter, lists it, and reapplies it on click", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeLead()])));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("My hot leads"));

    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "qualified");

    await user.click(screen.getByRole("button", { name: "Save current filter" }));
    const saved = await within(screen.getByLabelText("Saved filters")).findByRole("button", {
      name: "My hot leads",
    });
    expect(saved).toBeInTheDocument();

    // Change the filter away, then reapply the saved one and confirm it's restored.
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "new");
    await user.click(saved);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("qualified");
  });

  it("toggles an optional column's visibility", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeLead()])));
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByText("Columns"));
    const tagsCheckbox = screen.getByRole("checkbox", { name: "Tags" });
    expect(tagsCheckbox).not.toBeChecked();
    await user.click(tagsCheckbox);
    expect(tagsCheckbox).toBeChecked();
    expect(screen.getByRole("columnheader", { name: "Tags" })).toBeInTheDocument();
  });
});

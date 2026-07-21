import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord } from "@titan/platform";
import { AssessmentWorkspaceContent } from "./AssessmentWorkspacePage.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    organizationId: null,
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: {},
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function searchResponse(
  assessments: AssessmentRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      assessments,
      total: overrides.total ?? assessments.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

/** ComplianceIntelligencePanel fetches GET /api/assessments (the full,
 * unfiltered list) independently of the table's own GET /api/assessments/search
 * — every test needs both mocked, distinguished by URL, mirroring
 * App.test.tsx's multi-endpoint mock pattern. */
function mockFetch(assessments: AssessmentRecord[], searchOverrides = {}) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/assessments/search")) {
      return Promise.resolve(searchResponse(assessments, searchOverrides));
    }
    if (url.includes("/api/assessments")) {
      return Promise.resolve(new Response(JSON.stringify(assessments), { status: 200 }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderWorkspace(
  me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true },
) {
  return render(
    <MemoryRouter>
      <AssessmentWorkspaceContent me={me} />
    </MemoryRouter>,
  );
}

describe("AssessmentWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real assessments with framework/risk badges, score, and a working reference link", async () => {
    mockFetch([
      makeAssessment({
        id: "e5f6a7b8-1111-1111-1111-111111111111",
        result: { ...sampleResult, riskLevel: "critical", score: 88 },
      }),
    ]);

    renderWorkspace();

    const link = await screen.findByRole("link", { name: "#e5f6a7b8" });
    expect(link).toHaveAttribute("href", "/admin/assessments/e5f6a7b8-1111-1111-1111-111111111111");
    const row = within(screen.getByRole("table", { name: "Assessments" }));
    expect(row.getByText("dpdp v1.0.0")).toBeInTheDocument();
    expect(row.getByText("Critical")).toBeInTheDocument();
    expect(row.getByText("88 / 100")).toBeInTheDocument();
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin, without firing the search request", async () => {
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

    // Both the table's own section and the independently-fetching
    // ComplianceIntelligencePanel report the same honest forbidden state —
    // two real, correct occurrences, not a duplication bug.
    expect(
      await screen.findAllByText("Platform Administrator role required to view this."),
    ).toHaveLength(2);
  });

  it("shows a real empty state when no assessments match", async () => {
    mockFetch([], { total: 0 });
    renderWorkspace();
    expect(await screen.findByText("No assessments match these filters")).toBeInTheDocument();
  });

  it("re-fetches with a riskLevel filter when one is chosen", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Risk level" }), "critical");

    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/assessments/search"));
      expect(searchCalls.at(-1)).toContain("riskLevel=critical");
    });
  });

  it("toggles sort direction on repeated header clicks, starting from the real initial state (createdAt/desc)", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });

    await user.click(screen.getByRole("button", { name: /Framework/ }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/assessments/search"));
      expect(searchCalls.at(-1)).toMatch(
        /sortBy=framework.*sortDirection=desc|sortDirection=desc.*sortBy=framework/,
      );
    });

    await user.click(screen.getByRole("button", { name: /Framework/ }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/assessments/search"));
      expect(searchCalls.at(-1)).toContain("sortDirection=asc");
    });
  });

  it("sorts by the real backend field riskScore when the Score header is clicked, never the bare 'risk' column id", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });

    await user.click(screen.getByRole("button", { name: /Score/ }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/assessments/search"));
      expect(searchCalls.at(-1)).toContain("sortBy=riskScore");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment()], { total: 50, page: 1, pageSize: 25 });
    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/assessments/search"));
      expect(searchCalls.at(-1)).toContain("page=2");
    });
  });

  it("saves the current filter, lists it, and reapplies it on click", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment()]);
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("Critical DPDP"));

    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Risk level" }), "critical");

    await user.click(screen.getByRole("button", { name: "Save current filter" }));
    const saved = await within(screen.getByLabelText("Saved filters")).findByRole("button", {
      name: "Critical DPDP",
    });
    expect(saved).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Risk level" }), "low");
    await user.click(saved);
    expect(screen.getByRole("combobox", { name: "Risk level" })).toHaveValue("critical");
  });

  it("toggles an optional column's visibility", async () => {
    const user = userEvent.setup();
    mockFetch([makeAssessment({ createdBy: "user_1" })]);
    renderWorkspace();
    await screen.findByRole("link", { name: "#a1b2c3d4" });

    await user.click(screen.getByText("Columns"));
    const createdByCheckbox = screen.getByRole("checkbox", { name: "Created by" });
    expect(createdByCheckbox).not.toBeChecked();
    await user.click(createdByCheckbox);
    expect(createdByCheckbox).toBeChecked();
    expect(screen.getByRole("columnheader", { name: "Created by" })).toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsPanel } from "./AnalyticsPanel.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true };

describe("AnalyticsPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the default entity's trend and renders a real per-day table", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      expect(url).toContain("/api/reports/trends");
      expect(url).toContain("entity=leads");
      return Promise.resolve(
        jsonResponse({
          entity: "leads",
          days: 30,
          points: [
            { date: "2026-07-20", count: 2 },
            { date: "2026-07-21", count: 4 },
          ],
        }),
      );
    });

    render(<AnalyticsPanel me={me} />);
    expect(await screen.findByRole("table", { name: "Leads trend by day" })).toBeInTheDocument();
    expect(screen.getByText("2026-07-20")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("re-fetches for the newly selected entity when the selector changes", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      const entity = new URL(url).searchParams.get("entity");
      return Promise.resolve(
        jsonResponse({ entity, days: 30, points: [{ date: "2026-07-21", count: 1 }] }),
      );
    });

    render(<AnalyticsPanel me={me} />);
    await screen.findByRole("table", { name: "Leads trend by day" });

    await user.selectOptions(screen.getByLabelText("Entity"), "Audit volume");

    await waitFor(() => {
      expect(screen.getByRole("table", { name: "Audit volume trend by day" })).toBeInTheDocument();
    });
  });

  it("shows a clear, honest 'Platform Administrator required' message for a non-platform-administrator, without fetching", () => {
    const calledPaths: string[] = [];
    vi.mocked(fetch).mockImplementation((input) => {
      calledPaths.push(String(input));
      return Promise.reject(new Error("should not be called"));
    });

    render(
      <AnalyticsPanel
        me={{ userId: "u2", email: "member@acme.in", profiles: [], isPlatformAdministrator: false }}
      />,
    );
    expect(
      screen.getByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
    expect(calledPaths).toHaveLength(0);
  });
});

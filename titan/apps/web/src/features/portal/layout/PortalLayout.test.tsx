import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../../admin/auth/SessionContext.js";
import { RequireAuth } from "../../admin/auth/RequireAuth.js";
import { PortalLayout } from "./PortalLayout.js";

function renderPortalLayout() {
  return render(
    <MemoryRouter initialEntries={["/portal"]}>
      <SessionProvider>
        <Routes>
          <Route
            path="/portal"
            element={
              <RequireAuth>
                <PortalLayout />
              </RequireAuth>
            }
          >
            <Route index element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("PortalLayout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the portal nav and the routed child content for a real organization member", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "user_1",
          email: "member@acme.in",
          profiles: [{ organizationId: "org_1", role: "member" }],
          isPlatformAdministrator: false,
        }),
        { status: 200 },
      ),
    );
    renderPortalLayout();

    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("shows an honest 'no organization membership' message instead of the routed content for a caller with no organization profile", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "user_2",
          email: "nobody@acme.in",
          profiles: [],
          isPlatformAdministrator: false,
        }),
        { status: 200 },
      ),
    );
    renderPortalLayout();

    expect(await screen.findByText("No organization membership")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
    // The nav itself is empty too — hidden entirely, not shown-then-blocked.
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});

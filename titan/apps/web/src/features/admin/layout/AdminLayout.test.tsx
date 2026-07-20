import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../auth/SessionContext.js";
import { RequireAuth } from "../auth/RequireAuth.js";
import { AdminLayout } from "./AdminLayout.js";

// Composed the same way App.tsx actually composes them — AdminLayout's own
// doc comment states it's only ever rendered inside RequireAuth (by the
// time it mounts, useSession() is always "authenticated"), so testing it
// without that wrapper would test a state the real app never produces.
function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <SessionProvider>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
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

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the signed-in caller's real email and a sign-out link once the session resolves", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "user_1",
          email: "admin@acme.in",
          profiles: [],
          isPlatformAdministrator: true,
        }),
        { status: 200 },
      ),
    );
    renderAdminLayout();

    expect(await screen.findByText("admin@acme.in")).toBeInTheDocument();
    const signOut = screen.getByRole("link", { name: "Sign out" });
    expect(signOut).toHaveAttribute("href", expect.stringContaining("/api/auth/signout"));
  });

  it("renders the Dashboard nav item and the routed child content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "user_1",
          email: "admin@acme.in",
          profiles: [],
          isPlatformAdministrator: false,
        }),
        { status: 200 },
      ),
    );
    renderAdminLayout();

    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("renders no session UI, and no premature child content, while the session is still loading", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderAdminLayout();
    expect(screen.queryByRole("link", { name: "Sign out" })).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });
});

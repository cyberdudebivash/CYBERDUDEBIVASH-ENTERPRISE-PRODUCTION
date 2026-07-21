import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App.js";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  it("renders the home page at /", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Titan platform foundation" })).toBeInTheDocument();
  });

  it("renders NotFound for an unmatched path", () => {
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("always renders the shell (header, nav, footer) around the page content", () => {
    renderAt("/");
    expect(screen.getByText("Titan")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByText(/CyberDudeBivash Pvt\. Ltd\./)).toBeInTheDocument();
  });

  it("has a working skip link to the main content landmark", () => {
    renderAt("/");
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });

  it("navigates via the sidebar without a full page reload", async () => {
    const user = userEvent.setup();
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("heading", { name: "Titan platform foundation" })).toBeInTheDocument();
  });

  it("renders the DPDP assessment at its own route, outside the admin shell", () => {
    renderAt("/assessment/dpdp");
    expect(screen.getByRole("heading", { name: /Is Your Startup/ })).toBeInTheDocument();
    // Not wrapped in Layout: no header "Titan" wordmark, no sidebar nav landmark.
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  describe("/admin (EAP-1)", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("resolves to the real literal /admin route, not the '*' NotFound fallback", () => {
      vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves — loading state
      renderAt("/admin");
      expect(screen.queryByRole("heading", { name: "Page not found" })).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    });

    it("renders the real Dashboard, inside the admin shell, for an authenticated session", async () => {
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
      renderAt("/admin");

      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByText("admin@acme.in")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    });
  });

  describe("/admin/leads (EAP-2)", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("resolves the real literal /admin/leads route, with Leads in the nav, for a Platform Administrator", async () => {
      vi.mocked(fetch).mockImplementation((input) => {
        const url = String(input);
        if (url.includes("/api/me")) {
          return Promise.resolve(
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
        }
        if (url.includes("/api/leads/search")) {
          return Promise.resolve(
            new Response(JSON.stringify({ leads: [], total: 0, page: 1, pageSize: 25 }), {
              status: 200,
            }),
          );
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      });

      renderAt("/admin/leads");

      expect(await screen.findByRole("heading", { name: "Leads" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Leads" })).toHaveClass(
        "titan-sidebar__link--active",
      );
      expect(screen.queryByRole("heading", { name: "Page not found" })).not.toBeInTheDocument();
    });
  });
});

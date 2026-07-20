import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider } from "./SessionContext.js";
import { RequireAuth } from "./RequireAuth.js";

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a loading state while the session is still resolving", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <SessionProvider>
          <RequireAuth>
            <div>Protected content</div>
          </RequireAuth>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children once a real session resolves as authenticated", async () => {
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
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <SessionProvider>
          <RequireAuth>
            <div>Protected content</div>
          </RequireAuth>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to the Worker's real sign-in page, with a callback URL back to the current path, when unauthenticated", async () => {
    // jsdom doesn't implement real cross-origin navigation (`Not
    // implemented: navigation`) and its Location.href isn't a configurable
    // accessor (vi.spyOn can't redefine it either) — swapping the whole
    // `window.location` for a plain, writable object is the standard
    // workaround, and still proves the component attempted the real
    // navigation with the real URL, not a stub. `any` here is a
    // narrowly-scoped test-mock escape hatch, not a statement about this
    // app's real types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const originalLocation = win.location;
    delete win.location;
    win.location = { ...originalLocation, href: originalLocation.href };

    try {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Authentication required" } }), {
          status: 401,
        }),
      );
      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <SessionProvider>
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          </SessionProvider>
        </MemoryRouter>,
      );

      await vi.waitFor(() => {
        expect(window.location.href).toContain("/api/auth/signin");
      });
      expect(window.location.href).toContain(encodeURIComponent("/admin"));
      expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    } finally {
      win.location = originalLocation;
    }
  });

  it("shows the real error message, not a generic one, when the session check fails outright", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <SessionProvider>
          <RequireAuth>
            <div>Protected content</div>
          </RequireAuth>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
  });
});

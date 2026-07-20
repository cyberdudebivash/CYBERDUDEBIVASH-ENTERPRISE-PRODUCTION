import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionProvider, useSession } from "./SessionContext.js";

function Probe() {
  const session = useSession();
  return <div data-testid="session-status">{session.status}</div>;
}

describe("SessionProvider / useSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in the loading state", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId("session-status")).toHaveTextContent("loading");
  });

  it("resolves to authenticated with the real /api/me payload", async () => {
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
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
  });

  it("resolves to unauthenticated (not error) on a 401 from /api/me", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Authentication required" } }), {
        status: 401,
      }),
    );
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();
  });

  it("resolves to error for a failure that isn't a 401", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(await screen.findByText("error")).toBeInTheDocument();
  });

  it("throws when useSession is called outside a SessionProvider", () => {
    // Suppress React's expected console.error for the thrown-render case.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useSession must be used within a SessionProvider/);
    consoleError.mockRestore();
  });
});

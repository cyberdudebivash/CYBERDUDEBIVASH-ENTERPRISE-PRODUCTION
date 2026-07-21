import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalSupportPage } from "./PortalSupportPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PortalSupportPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real request history with an honest 'open' status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse([
        {
          id: "request_1",
          organizationId: "org_1",
          createdBy: "user_1",
          subject: "Can't download report",
          message: "The export button spins.",
          status: "open",
          createdAt: "2026-07-20T00:00:00.000Z",
        },
      ]),
    );

    render(<PortalSupportPage />);

    expect(await screen.findByText("Can't download report")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("shows a real empty state before any request has been submitted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    render(<PortalSupportPage />);
    expect(await screen.findByText("No requests yet")).toBeInTheDocument();
  });

  it("submits a real request and refreshes the history from the server", async () => {
    const user = userEvent.setup();
    let hasSubmitted = false;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/support") && init?.method === "POST") {
        hasSubmitted = true;
        return Promise.resolve(
          jsonResponse(
            {
              id: "request_1",
              organizationId: "org_1",
              createdBy: "user_1",
              subject: "New issue",
              message: "Details here",
              status: "open",
              createdAt: "2026-07-21T00:00:00.000Z",
            },
            201,
          ),
        );
      }
      if (url.includes("/api/portal/support")) {
        return Promise.resolve(
          jsonResponse(
            hasSubmitted
              ? [
                  {
                    id: "request_1",
                    organizationId: "org_1",
                    createdBy: "user_1",
                    subject: "New issue",
                    message: "Details here",
                    status: "open",
                    createdAt: "2026-07-21T00:00:00.000Z",
                  },
                ]
              : [],
          ),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(<PortalSupportPage />);
    await screen.findByText("No requests yet");

    await user.type(screen.getByLabelText("Subject"), "New issue");
    await user.type(screen.getByLabelText("Message"), "Details here");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Request submitted")).toBeInTheDocument();
    expect(await screen.findByText("New issue")).toBeInTheDocument();
  });
});

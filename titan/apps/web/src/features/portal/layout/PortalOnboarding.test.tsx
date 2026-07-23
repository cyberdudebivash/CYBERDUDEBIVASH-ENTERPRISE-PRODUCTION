import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalOnboarding } from "./PortalOnboarding.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PortalOnboarding", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the real form", () => {
    render(<PortalOnboarding />);
    expect(screen.getByText("Create your organization")).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create organization" })).toBeInTheDocument();
  });

  it("submits the real name/industry to POST /api/portal/organization and reloads on success", async () => {
    const user = userEvent.setup();
    let submittedBody: unknown = null;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/organization") && init?.method === "POST") {
        submittedBody = JSON.parse(init.body as string);
        return Promise.resolve(
          jsonResponse(
            {
              organization: { id: "org_1", name: "Acme Fintech", slug: "acme-fintech" },
              profile: { id: "profile_1", role: "owner" },
            },
            201,
          ),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });

    render(<PortalOnboarding />);
    await user.type(screen.getByLabelText(/Organization name/), "Acme Fintech");
    await user.type(screen.getByLabelText(/Industry/), "Financial Services");
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalled());
    expect(submittedBody).toEqual({ name: "Acme Fintech", industry: "Financial Services" });
  });

  it("shows a real error and does not reload when creation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        { error: { code: "conflict", message: "This account already belongs to an organization" } },
        409,
      ),
    );
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });

    render(<PortalOnboarding />);
    await user.type(screen.getByLabelText(/Organization name/), "Acme Fintech");
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    expect(
      await screen.findByText("This account already belongs to an organization"),
    ).toBeInTheDocument();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CommercialSubscriptionDetailContent } from "./CommercialSubscriptionDetailPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const detailPayload = {
  subscription: {
    id: "sub_1",
    organizationId: "org_1",
    planId: "professional",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    canceledAt: null,
  },
  plan: {
    id: "professional",
    name: "Professional",
    tier: 2,
    priceDisplay: "$1,499/month",
    trialDays: 14,
    entitlements: {
      complianceReportExport: true,
      supportRequests: true,
      prioritySupport: false,
      maxSeats: 50,
    },
  },
  license: {
    id: "lic_1",
    organizationId: "org_1",
    subscriptionId: "sub_1",
    seatLimit: 50,
    status: "active",
    activatedAt: "2026-07-20T00:00:00.000Z",
    expiresAt: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  },
  seatsUsed: 12,
};

function render_() {
  return render(
    <MemoryRouter>
      <CommercialSubscriptionDetailContent id="sub_1" />
    </MemoryRouter>,
  );
}

describe("CommercialSubscriptionDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the real plan, license usage, and status", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(detailPayload));
    render_();

    expect(await screen.findByRole("heading", { name: "Professional" })).toBeInTheDocument();
    expect(screen.getByText("12 / 50")).toBeInTheDocument();
    expect(screen.getByText("org_1")).toBeInTheDocument();
  });

  it("sends a real PATCH when an admin cancels the subscription", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (
        url.includes("/api/commercial/subscriptions/sub_1") &&
        (!init || init.method === undefined)
      ) {
        return Promise.resolve(jsonResponse(detailPayload));
      }
      if (url.includes("/api/commercial/subscriptions/sub_1") && init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ ...detailPayload.subscription, status: "canceled" }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    render_();
    await screen.findByRole("heading", { name: "Professional" });

    await user.click(screen.getByRole("button", { name: "Cancel subscription" }));

    await vi.waitFor(() => {
      const patchCall = vi.mocked(fetch).mock.calls.find((call) => call[1]?.method === "PATCH");
      expect(patchCall).toBeDefined();
      expect(JSON.parse(String(patchCall![1]!.body))).toEqual({ status: "canceled" });
    });
  });
});

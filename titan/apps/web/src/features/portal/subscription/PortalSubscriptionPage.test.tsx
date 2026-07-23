import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalSubscriptionPage } from "./PortalSubscriptionPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const plansPayload = [
  {
    id: "starter",
    name: "Starter",
    tier: 1,
    priceDisplay: "$499/month",
    trialDays: 14,
    entitlements: {
      complianceReportExport: false,
      supportRequests: true,
      prioritySupport: false,
      maxSeats: 10,
    },
  },
  {
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
  {
    id: "enterprise",
    name: "Enterprise",
    tier: 3,
    priceDisplay: "Contact sales",
    trialDays: 0,
    entitlements: {
      complianceReportExport: true,
      supportRequests: true,
      prioritySupport: true,
      maxSeats: 250,
    },
  },
];

const activeSummaryPayload = {
  organizationId: "org_1",
  subscription: {
    id: "sub_1",
    planId: "starter",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: "2026-08-20T00:00:00.000Z",
    canceledAt: null,
  },
  plan: plansPayload[0],
  license: { id: "lic_1", seatLimit: 10, status: "active", expiresAt: null },
  seatsUsed: 3,
  entitlements: plansPayload[0]!.entitlements,
};

const emptySummaryPayload = {
  organizationId: "org_1",
  subscription: null,
  plan: null,
  license: null,
  seatsUsed: 0,
  entitlements: null,
};

describe("PortalSubscriptionPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an honest 'choose a plan' state with real plan cards when there is no subscription yet", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/commercial/subscription")) {
        return Promise.resolve(jsonResponse(emptySummaryPayload));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    render(<PortalSubscriptionPage />);

    expect(
      await screen.findByText("Your organization does not have an active subscription yet."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Professional trial" })).toBeInTheDocument();
    // Enterprise is sales-assisted — no self-service start button.
    expect(screen.queryByRole("button", { name: /Enterprise/ })).not.toBeInTheDocument();
  });

  it("subscribes to a real plan when a customer clicks its action button", async () => {
    const user = userEvent.setup();
    let subscribed = false;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/commercial/subscription") && init?.method === "POST") {
        subscribed = true;
        return Promise.resolve(
          jsonResponse(
            {
              subscription: activeSummaryPayload.subscription,
              license: activeSummaryPayload.license,
            },
            201,
          ),
        );
      }
      if (url.includes("/api/portal/commercial/subscription")) {
        return Promise.resolve(
          jsonResponse(subscribed ? activeSummaryPayload : emptySummaryPayload),
        );
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    render(<PortalSubscriptionPage />);

    await user.click(await screen.findByRole("button", { name: "Start Starter trial" }));

    expect(await screen.findByRole("heading", { name: "Current plan" })).toBeInTheDocument();
  });

  it("renders the real current plan, status, seat usage, and entitlements for an active subscription", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/commercial/subscription")) {
        return Promise.resolve(jsonResponse(activeSummaryPayload));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    render(<PortalSubscriptionPage />);

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to Professional" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel subscription" })).toBeInTheDocument();
  });

  it("cancels the subscription when a customer clicks Cancel subscription", async () => {
    const user = userEvent.setup();
    let canceled = false;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/commercial/subscription") && init?.method === "PATCH") {
        canceled = true;
        return Promise.resolve(
          jsonResponse({ ...activeSummaryPayload.subscription, status: "canceled" }),
        );
      }
      if (url.includes("/api/portal/commercial/subscription")) {
        return Promise.resolve(
          jsonResponse(
            canceled
              ? {
                  ...activeSummaryPayload,
                  subscription: { ...activeSummaryPayload.subscription, status: "canceled" },
                }
              : activeSummaryPayload,
          ),
        );
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    render(<PortalSubscriptionPage />);

    await user.click(await screen.findByRole("button", { name: "Cancel subscription" }));

    // Reactivating now requires a real Razorpay checkout (see
    // commercialApi.ts's updatePortalSubscription doc comment) — this only
    // proves the real action surfaces, not the checkout flow itself, which
    // is the shared useRazorpaySubscriptionCheckout hook's own tests'
    // job (exercised end to end via DpdpScannerPage.test.tsx).
    expect(
      await screen.findByRole("button", { name: "Reactivate subscription" }),
    ).toBeInTheDocument();
  });
});

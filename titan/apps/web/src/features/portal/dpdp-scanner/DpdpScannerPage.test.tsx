import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { dpdpV1 } from "@titan/assessment-core";
import type { AssessmentResult } from "@titan/assessment-core";
import { SessionProvider } from "../../admin/auth/SessionContext.js";
import { DpdpScannerPage } from "./DpdpScannerPage.js";
import { openRazorpayCheckout } from "../../admin/commercial/razorpayCheckout.js";
import type { RazorpaySuccessResponse } from "../../admin/commercial/razorpayCheckout.js";
import { buildDpdpReportPdf } from "../../dpdp-assessment/pdfReport.js";

// Razorpay's real Checkout widget (a script-injected `window.Razorpay`) has
// no real counterpart in a jsdom test — real coverage of the widget-loading
// mechanics themselves lives in razorpayCheckout.test.ts. Here it's mocked
// so a test can drive "checkout succeeded" the same way Razorpay's own
// `handler` callback would.
vi.mock("../../admin/commercial/razorpayCheckout.js", () => ({
  loadRazorpayCheckout: vi.fn().mockResolvedValue(undefined),
  openRazorpayCheckout: vi.fn(),
}));

// Same reasoning DpdpAssessmentPage.test.tsx already established for this
// exact module: jsPDF's real PDF bytes aren't the thing under test here —
// that's pdfReport.test.ts's job — only that the portal wires the right
// real inputs (org name, session email, the real saved result) into it.
vi.mock("../../dpdp-assessment/pdfReport.js", () => ({
  buildDpdpReportPdf: vi.fn().mockResolvedValue({ save: vi.fn() }),
  reportFileName: (company: string) => `DPDP-Risk-Report-${company}.pdf`,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const plansPayload = [
  {
    id: "starter",
    name: "Starter",
    tier: 1,
    priceDisplay: "$499/month",
    pricing: { INR: 999_900, USD: 49_900, EUR: 45_900, GBP: 39_900 },
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
    pricing: { INR: 2_999_900, USD: 149_900, EUR: 139_900, GBP: 119_900 },
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
    pricing: null,
    trialDays: 0,
    entitlements: {
      complianceReportExport: true,
      supportRequests: true,
      prioritySupport: true,
      maxSeats: 250,
    },
  },
];

const mePayload = {
  userId: "user_1",
  email: "asha@acme.in",
  profiles: [
    {
      id: "profile_1",
      userId: "user_1",
      organizationId: "org_1",
      role: "member",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  isPlatformAdministrator: false,
};

const scoredResult: AssessmentResult = {
  score: 100,
  riskLevel: "critical",
  breakdown: { critical: 12, high: 0, medium: 0, low: 0, total: 12 },
  gaps: [],
  scoredQuestionCount: 12,
};

async function answerEveryQuestion(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < dpdpV1.questions.length; i++) {
    const textbox = screen.queryByRole("textbox");
    if (textbox) {
      await user.type(textbox, "Acme Fintech, 25 employees");
    } else {
      await user.click(screen.getByRole("radio", { name: "No, we do not have this in place" }));
    }
    const isLast = i === dpdpV1.questions.length - 1;
    await user.click(screen.getByRole("button", { name: isLast ? "Get My Report" : "Next" }));
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <DpdpScannerPage />
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("DpdpScannerPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(openRazorpayCheckout).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the Razorpay paywall with real self-service plans when the organization has no access yet", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: false }));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      if (url.includes("/api/me")) {
        return Promise.resolve(jsonResponse(mePayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Unlock the DPDP Compliance Scanner" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Unlock with Starter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock with Professional" })).toBeInTheDocument();
    // Enterprise is sales-assisted (pricing: null) — no self-service checkout button.
    expect(screen.queryByRole("button", { name: /Enterprise/ })).not.toBeInTheDocument();
  });

  it("runs a real recurring Razorpay checkout (Subscriptions API), verifies the payment, and unlocks the scanner", async () => {
    const user = userEvent.setup();
    let verified = false;
    let capturedCheckoutBody: unknown;
    let capturedVerifyBody: unknown;

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: verified }));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      if (url.includes("/api/portal/commercial/razorpay/subscriptions")) {
        capturedCheckoutBody = JSON.parse(init?.body as string);
        return Promise.resolve(
          jsonResponse(
            {
              providerSubscriptionId: "sub_1",
              amountPaise: 999_900,
              currency: "INR",
              keyId: "rzp_test_fake",
              transactionId: "txn_1",
            },
            201,
          ),
        );
      }
      if (url.includes("/api/portal/commercial/razorpay/verify")) {
        capturedVerifyBody = JSON.parse(init?.body as string);
        verified = true;
        return Promise.resolve(jsonResponse({ verified: true, transactionId: "txn_1" }));
      }
      if (url.includes("/api/me")) {
        return Promise.resolve(jsonResponse(mePayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    // Simulates Razorpay's own Checkout widget completing successfully and
    // invoking the `handler` callback it was opened with.
    vi.mocked(openRazorpayCheckout).mockImplementation((options) => {
      options.handler({
        razorpay_subscription_id: "sub_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "sig_1",
      } satisfies RazorpaySuccessResponse);
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unlock with Starter" }));

    expect(await screen.findByRole("button", { name: "Start scan" })).toBeInTheDocument();
    expect(capturedCheckoutBody).toEqual({ planId: "starter", currency: "INR" });
    expect(capturedVerifyBody).toEqual({
      razorpay_subscription_id: "sub_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "sig_1",
    });
  });

  it("opens checkout in the currency the customer selects", async () => {
    const user = userEvent.setup();
    let capturedCheckoutBody: unknown;

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: false }));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      if (url.includes("/api/portal/commercial/razorpay/subscriptions")) {
        capturedCheckoutBody = JSON.parse(init?.body as string);
        return Promise.resolve(
          jsonResponse(
            {
              providerSubscriptionId: "sub_usd",
              amountPaise: 49_900,
              currency: "USD",
              keyId: "rzp_test_fake",
              transactionId: "txn_usd",
            },
            201,
          ),
        );
      }
      if (url.includes("/api/me")) {
        return Promise.resolve(jsonResponse(mePayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderPage();
    await screen.findByRole("button", { name: "Unlock with Starter" });
    await user.selectOptions(screen.getByLabelText("Billing currency"), "USD");
    await user.click(screen.getByRole("button", { name: "Unlock with Starter" }));

    await vi.waitFor(() =>
      expect(capturedCheckoutBody).toEqual({ planId: "starter", currency: "USD" }),
    );
  });

  it("shows a real error and re-enables the button when checkout creation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: false }));
      }
      if (url.includes("/api/commercial/plans")) {
        return Promise.resolve(jsonResponse(plansPayload));
      }
      if (url.includes("/api/portal/commercial/razorpay/subscriptions")) {
        return Promise.resolve(
          jsonResponse(
            { error: { code: "razorpay_error", message: "Authentication failed" } },
            502,
          ),
        );
      }
      if (url.includes("/api/me")) {
        return Promise.resolve(jsonResponse(mePayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unlock with Starter" }));

    expect(await screen.findByText("Authentication failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock with Starter" })).toBeEnabled();
    expect(openRazorpayCheckout).not.toHaveBeenCalled();
  });

  it("walks intro -> questions -> results for an organization that already has access, saving a real scan via the portal endpoint", async () => {
    const user = userEvent.setup();
    let capturedScanBody: unknown;

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: true }));
      }
      if (url.includes("/api/portal/organization")) {
        return Promise.resolve(
          jsonResponse({
            id: "org_1",
            name: "Acme Fintech",
            slug: "acme-fintech",
            status: "active",
            industry: null,
            region: null,
            tags: [],
            createdAt: "2026-07-01T00:00:00.000Z",
            updatedAt: "2026-07-01T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/dpdp-scanner/scan")) {
        capturedScanBody = JSON.parse(init?.body as string);
        return Promise.resolve(
          jsonResponse(
            {
              id: "assessment_1",
              organizationId: "org_1",
              createdBy: "user_1",
              framework: "dpdp",
              frameworkVersion: dpdpV1.version,
              answers: (capturedScanBody as { answers: unknown }).answers,
              result: scoredResult,
              createdAt: "2026-07-23T00:00:00.000Z",
            },
            201,
          ),
        );
      }
      if (url.includes("/api/me")) {
        return Promise.resolve(jsonResponse(mePayload));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start scan" }));
    await answerEveryQuestion(user);

    expect(
      await screen.findByText("Risk score: 100 out of 100, CRITICAL RISK."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View saved result" })).toHaveAttribute(
      "href",
      "/portal/assessments/assessment_1",
    );
    expect(screen.getByRole("link", { name: "View full history" })).toHaveAttribute(
      "href",
      "/portal/assessments",
    );
    expect(capturedScanBody).toMatchObject({ answers: expect.any(Object) });

    await user.click(screen.getByRole("button", { name: "Download PDF report" }));

    await vi.waitFor(() => {
      expect(buildDpdpReportPdf).toHaveBeenCalledWith({
        name: mePayload.email,
        email: mePayload.email,
        company: "Acme Fintech",
        result: scoredResult,
      });
    });
  });
});

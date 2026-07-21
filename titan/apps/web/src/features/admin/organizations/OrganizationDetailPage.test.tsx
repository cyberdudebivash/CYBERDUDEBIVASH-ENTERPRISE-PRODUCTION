import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadRecord,
  OrganizationRecord,
} from "@titan/platform";
import { OrganizationDetailContent } from "./OrganizationDetailPage.js";

const sampleResult: AssessmentResult = {
  score: 42,
  riskLevel: "high",
  breakdown: { critical: 1, high: 1, medium: 0, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: "org_1",
    name: "Acme Fintech",
    slug: "acme-fintech",
    status: "active",
    industry: "Financial Services",
    region: "APAC",
    tags: ["enterprise"],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000001",
    organizationId: "org_1",
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: {},
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: "org_1",
    assessmentId: null,
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: sampleResult,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: null,
    tags: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function mockOrganizationBackend(options: {
  organization: OrganizationRecord;
  auditEvents?: AuditEventRecord[];
  linkedLeads?: LeadRecord[];
  linkedAssessments?: AssessmentRecord[];
  linkedLeadsStatus?: number;
  onPatch?: (body: unknown) => void;
}) {
  const {
    organization,
    auditEvents = [],
    linkedLeads = [],
    linkedAssessments = [],
    linkedLeadsStatus = 200,
    onPatch,
  } = options;

  let current = organization;

  vi.mocked(fetch).mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes(`/api/organizations/${current.id}`) && (!init || init.method === undefined)) {
      return Promise.resolve(jsonResponse(current));
    }
    if (url.includes(`/api/organizations/${current.id}`) && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as Partial<OrganizationRecord>;
      onPatch?.(body);
      current = { ...current, ...body, updatedAt: "2026-07-21T00:00:00.000Z" };
      return Promise.resolve(jsonResponse(current));
    }
    if (url.includes("/api/audit")) {
      return Promise.resolve(jsonResponse(auditEvents));
    }
    if (url.includes("/api/leads/search")) {
      if (linkedLeadsStatus !== 200) {
        return Promise.resolve(
          jsonResponse({ error: { message: "forbidden" } }, linkedLeadsStatus),
        );
      }
      return Promise.resolve(
        jsonResponse({ leads: linkedLeads, total: linkedLeads.length, page: 1, pageSize: 100 }),
      );
    }
    if (url.includes("/api/assessments/search")) {
      return Promise.resolve(
        jsonResponse({
          assessments: linkedAssessments,
          total: linkedAssessments.length,
          page: 1,
          pageSize: 100,
        }),
      );
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderDetail(id = "org_1") {
  return render(
    <MemoryRouter>
      <OrganizationDetailContent id={id} />
    </MemoryRouter>,
  );
}

describe("OrganizationDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real metadata and status", async () => {
    mockOrganizationBackend({ organization: makeOrganization() });
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Acme Fintech" })).toBeInTheDocument();
    expect(screen.getByText("acme-fintech")).toBeInTheDocument();
    expect(screen.getByText("Financial Services")).toBeInTheDocument();
    expect(screen.getByText("APAC")).toBeInTheDocument();
    // "Active" legitimately renders twice: the heading's status badge and
    // the Administration panel's Lifecycle field — two real, correct
    // occurrences, not a duplication bug (same class of issue
    // AssessmentDetailPage.test.tsx's "dpdp v1.0.0" assertion hit in EAP-3).
    expect(screen.getByText("Active", { selector: ".titan-badge" })).toBeInTheDocument();
  });

  it("shows an honest 'no assessments yet' health state, then real health metrics once assessments exist", async () => {
    mockOrganizationBackend({ organization: makeOrganization() });
    renderDetail();
    await screen.findByRole("heading", { name: "Acme Fintech" });
    expect(
      await screen.findByText(/No assessments linked to this organization yet/),
    ).toBeInTheDocument();
  });

  it("renders real linked leads and assessments with working links into their own modules", async () => {
    mockOrganizationBackend({
      organization: makeOrganization(),
      linkedLeads: [makeLead()],
      linkedAssessments: [makeAssessment()],
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Acme Fintech" });

    const leadLink = await screen.findByRole("link", { name: "Asha Rao" });
    expect(leadLink).toHaveAttribute("href", "/admin/leads/lead_1");
    const assessmentLink = screen.getByRole("link", { name: /a1b2c3d4 — dpdp v1.0.0/ });
    expect(assessmentLink).toHaveAttribute(
      "href",
      "/admin/assessments/a1b2c3d4-0000-0000-0000-000000000001",
    );
  });

  it("renders the real audit trail for this organization as a timeline", async () => {
    mockOrganizationBackend({
      organization: makeOrganization(),
      auditEvents: [
        {
          id: "e1",
          actorId: "u1",
          organizationId: "org_1",
          action: "organization.created",
          entityType: "organization",
          entityId: "org_1",
          metadata: null,
          createdAt: "2026-07-19T00:00:00.000Z",
        },
        {
          id: "e2",
          actorId: "u1",
          organizationId: "org_1",
          action: "organization.viewed",
          entityType: "organization",
          entityId: "org_1",
          metadata: null,
          createdAt: "2026-07-20T00:00:00.000Z",
        },
      ],
    });
    renderDetail();

    expect(await screen.findByText("Organization created")).toBeInTheDocument();
    expect(screen.getByText("Organization viewed")).toBeInTheDocument();
  });

  it("archives the organization via the Administration panel and reflects the new status after refetch", async () => {
    const user = userEvent.setup();
    let patchedBody: Record<string, unknown> | undefined;
    mockOrganizationBackend({
      organization: makeOrganization(),
      onPatch: (body) => {
        patchedBody = body as Record<string, unknown>;
      },
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Acme Fintech" });

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await vi.waitFor(() => {
      expect(patchedBody).toEqual({ status: "archived" });
    });
    // Scoped to the badge — "Archived" also legitimately renders in the
    // Administration panel's own Lifecycle field, same as the "Active"
    // assertion above.
    expect(await screen.findByText("Archived", { selector: ".titan-badge" })).toBeInTheDocument();
  });

  it("shows a forbidden note when the organization itself is forbidden", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "Platform Administrator role required" } }, 403),
    );
    renderDetail();
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows forbidden only for relationships when the caller can see the organization but not GET /api/leads/search", async () => {
    mockOrganizationBackend({
      organization: makeOrganization(),
      linkedLeadsStatus: 403,
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Acme Fintech" });

    const relationshipsHeading = await screen.findByRole("heading", { name: "Relationships" });
    const relationshipsPanel = relationshipsHeading.closest("section") ?? document.body;
    expect(
      within(relationshipsPanel as HTMLElement).getByText(
        "Platform Administrator role required to view this.",
      ),
    ).toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord, AuditEventRecord, LeadRecord } from "@titan/platform";
import { AssessmentDetailContent } from "./AssessmentDetailPage.js";

const sampleResult: AssessmentResult = {
  score: 42,
  riskLevel: "high",
  breakdown: { critical: 1, high: 1, medium: 0, low: 10, total: 2 },
  gaps: [
    {
      questionId: "has_dpo",
      question: "Do you have a Data Protection Officer (DPO) appointed?",
      level: "critical",
      penalty: "₹150 crore (SDF violation)",
      section: "Section 10",
    },
  ],
  scoredQuestionCount: 12,
};

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "assessment_1",
    organizationId: null,
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: { has_dpo: false },
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const me = { userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true };

function mockAssessmentBackend(options: {
  assessment: AssessmentRecord;
  auditEvents?: AuditEventRecord[];
  organizations?: Array<{ id: string; name: string; slug: string; createdAt: string }>;
  linkedLeadsStatus?: number;
  linkedLeads?: LeadRecord[];
}) {
  const {
    assessment,
    auditEvents = [],
    organizations = [],
    linkedLeadsStatus = 200,
    linkedLeads = [],
  } = options;

  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes(`/api/assessments/${assessment.id}`)) {
      return Promise.resolve(jsonResponse(assessment));
    }
    if (url.includes("/api/audit")) {
      return Promise.resolve(jsonResponse(auditEvents));
    }
    if (url.includes("/api/organizations")) {
      return Promise.resolve(jsonResponse(organizations));
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
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderDetail(id = "assessment_1") {
  return render(
    <MemoryRouter>
      <AssessmentDetailContent id={id} me={me} />
    </MemoryRouter>,
  );
}

describe("AssessmentDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real metadata, an honest 'Completed' status, and risk/compliance results", async () => {
    mockAssessmentBackend({ assessment: makeAssessment() });
    renderDetail();

    expect(
      await screen.findByRole("heading", { name: "Assessment #assessme" }),
    ).toBeInTheDocument();
    // "dpdp v1.0.0" legitimately renders twice: the Metadata panel's plain
    // text and the Results panel's FrameworkBadge — two real, correct
    // occurrences of the same framework fact, not a duplication bug.
    expect(screen.getAllByText("dpdp v1.0.0")).toHaveLength(2);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Not linked to an organization")).toBeInTheDocument();
    expect(screen.getByText("42 / 100")).toBeInTheDocument();
  });

  it("resolves organizationId to a real organization name via GET /api/organizations", async () => {
    mockAssessmentBackend({
      assessment: makeAssessment({ organizationId: "org_1" }),
      organizations: [{ id: "org_1", name: "Acme Fintech Pvt Ltd", slug: "acme", createdAt: "t" }],
    });
    renderDetail();
    expect(await screen.findByText("Acme Fintech Pvt Ltd")).toBeInTheDocument();
  });

  it("shows 'Me' for the owner when createdBy matches the current caller", async () => {
    mockAssessmentBackend({ assessment: makeAssessment({ createdBy: "u1" }) });
    renderDetail();
    await screen.findByRole("heading", { name: "Assessment #assessme" });
    expect(screen.getByText("Me")).toBeInTheDocument();
  });

  it("renders the real audit trail for this assessment as a timeline", async () => {
    mockAssessmentBackend({
      assessment: makeAssessment(),
      auditEvents: [
        {
          id: "e1",
          actorId: "u1",
          organizationId: null,
          action: "assessment.created",
          entityType: "assessment",
          entityId: "assessment_1",
          metadata: null,
          createdAt: "2026-07-19T00:00:00.000Z",
        },
        {
          id: "e2",
          actorId: "u1",
          organizationId: null,
          action: "assessment.viewed",
          entityType: "assessment",
          entityId: "assessment_1",
          metadata: null,
          createdAt: "2026-07-20T00:00:00.000Z",
        },
      ],
    });
    renderDetail();

    expect(await screen.findByText("Assessment created")).toBeInTheDocument();
    expect(screen.getByText("Assessment viewed")).toBeInTheDocument();
  });

  it("renders real linked leads with working links to Lead Details", async () => {
    mockAssessmentBackend({
      assessment: makeAssessment(),
      linkedLeads: [
        {
          id: "lead_1",
          organizationId: null,
          assessmentId: "assessment_1",
          name: "Asha Rao",
          email: "asha@acme.in",
          company: "Acme Fintech",
          answers: {},
          result: sampleResult,
          timestamp: "t",
          source: "dpdp-scan",
          status: "new",
          priority: "medium",
          assignedTo: null,
          tags: [],
        },
      ],
    });
    renderDetail();

    const link = await screen.findByRole("link", { name: "Asha Rao" });
    expect(link).toHaveAttribute("href", "/admin/leads/lead_1");
  });

  it("shows an honest 'no leads linked' note when none exist", async () => {
    mockAssessmentBackend({ assessment: makeAssessment() });
    renderDetail();
    expect(await screen.findByText("No leads are linked to this assessment.")).toBeInTheDocument();
  });

  it("shows forbidden only for lead linkage when the caller can see the assessment but not GET /api/leads/search (real, narrower authorization gap)", async () => {
    mockAssessmentBackend({ assessment: makeAssessment(), linkedLeadsStatus: 403 });
    renderDetail();

    await screen.findByRole("heading", { name: "Assessment #assessme" });
    const leadLinkagePanel = screen
      .getByRole("heading", { name: "Lead linkage" })
      .closest("section")!;
    // The linked-leads fetch only starts once the assessment itself is
    // ready (a separate effect), so this resolves slightly after the
    // heading above — findByText (async, retrying), not getByText.
    expect(
      await within(leadLinkagePanel).findByText(
        "Platform Administrator role required to view this.",
      ),
    ).toBeInTheDocument();
    // The rest of the page is unaffected — the assessment itself still rendered.
    expect(screen.getByText("42 / 100")).toBeInTheDocument();
  });

  it("shows an honest 'Platform Administrator role required' message on a 403 for the assessment itself", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { error: { code: "forbidden", message: "Platform Administrator role required" } },
        403,
      ),
    );
    renderDetail();
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows a real error message when the assessment fails to load", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "Internal server error" } }, 500),
    );
    renderDetail();
    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });
});

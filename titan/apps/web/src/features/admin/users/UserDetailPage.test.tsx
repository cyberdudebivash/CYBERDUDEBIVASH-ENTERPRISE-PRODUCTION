import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type {
  AssessmentRecord,
  AuditEventRecord,
  LeadRecord,
  OrganizationRecord,
  UserProfileRecord,
} from "@titan/platform";
import { UserDetailContent } from "./UserDetailPage.js";
import type { UserWithProfiles } from "./userApi.js";

const sampleResult: AssessmentResult = {
  score: 42,
  riskLevel: "high",
  breakdown: { critical: 1, high: 1, medium: 0, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeUser(overrides: Partial<UserWithProfiles> = {}): UserWithProfiles {
  return {
    id: "user_1",
    name: "Asha Rao",
    email: "asha@acme.in",
    emailVerified: "2026-07-20T00:00:00.000Z",
    image: null,
    profiles: [],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfileRecord> = {}): UserProfileRecord {
  return {
    id: "profile_1",
    userId: "user_1",
    organizationId: "org_1",
    role: "member",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: "org_1",
    name: "Acme Fintech",
    slug: "acme-fintech",
    status: "active",
    industry: null,
    region: null,
    tags: [],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000001",
    organizationId: "org_1",
    createdBy: "user_1",
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
    name: "Priya Sharma",
    email: "priya@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: sampleResult,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: "user_1",
    tags: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function mockUserBackend(options: {
  user: UserWithProfiles;
  auditEvents?: AuditEventRecord[];
  organizations?: OrganizationRecord[];
  assignedLeads?: LeadRecord[];
  createdAssessments?: AssessmentRecord[];
  onGrant?: (body: unknown) => void;
  onPatch?: (profileId: string, body: unknown) => void;
  onRevoke?: (profileId: string) => void;
}) {
  const {
    user,
    auditEvents = [],
    organizations = [],
    assignedLeads = [],
    createdAssessments = [],
    onGrant,
    onPatch,
    onRevoke,
  } = options;

  let current = user;

  vi.mocked(fetch).mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith(`/api/users/${current.id}`) && method === "GET") {
      return Promise.resolve(jsonResponse(current));
    }
    if (url.endsWith(`/api/users/${current.id}/profiles`) && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        organizationId: string | null;
        role: string;
      };
      onGrant?.(body);
      const profile: UserProfileRecord = {
        id: `profile_${current.profiles.length + 1}`,
        userId: current.id,
        organizationId: body.organizationId,
        role: body.role as UserProfileRecord["role"],
        createdAt: "2026-07-21T00:00:00.000Z",
      };
      current = { ...current, profiles: [...current.profiles, profile] };
      return Promise.resolve(jsonResponse(profile, 201));
    }
    if (url.includes(`/api/users/${current.id}/profiles/`) && method === "PATCH") {
      const profileId = url.split("/profiles/")[1]!;
      const body = JSON.parse(String(init?.body)) as { role: string };
      onPatch?.(profileId, body);
      current = {
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.id === profileId
            ? { ...profile, role: body.role as UserProfileRecord["role"] }
            : profile,
        ),
      };
      const updated = current.profiles.find((profile) => profile.id === profileId);
      return Promise.resolve(jsonResponse(updated));
    }
    if (url.includes(`/api/users/${current.id}/profiles/`) && method === "DELETE") {
      const profileId = url.split("/profiles/")[1]!;
      onRevoke?.(profileId);
      current = {
        ...current,
        profiles: current.profiles.filter((profile) => profile.id !== profileId),
      };
      return Promise.resolve(jsonResponse({ id: profileId, revoked: true }));
    }
    if (url.includes("/api/audit")) {
      return Promise.resolve(jsonResponse(auditEvents));
    }
    if (url.endsWith("/api/organizations")) {
      return Promise.resolve(jsonResponse(organizations));
    }
    if (url.includes("/api/leads/search")) {
      return Promise.resolve(
        jsonResponse({
          leads: assignedLeads,
          total: assignedLeads.length,
          page: 1,
          pageSize: 100,
        }),
      );
    }
    if (url.includes("/api/assessments/search")) {
      return Promise.resolve(
        jsonResponse({
          assessments: createdAssessments,
          total: createdAssessments.length,
          page: 1,
          pageSize: 100,
        }),
      );
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderDetail(id = "user_1") {
  return render(
    <MemoryRouter>
      <UserDetailContent id={id} />
    </MemoryRouter>,
  );
}

describe("UserDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real identity fields", async () => {
    mockUserBackend({ user: makeUser() });
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Asha Rao" })).toBeInTheDocument();
    expect(screen.getByText("asha@acme.in")).toBeInTheDocument();
    expect(screen.getByText("user_1")).toBeInTheDocument();
  });

  it("shows a forbidden note when the user itself is forbidden", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "Platform Administrator role required" } }, 403),
    );
    renderDetail();
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("resolves an existing profile's organization name and role", async () => {
    mockUserBackend({
      user: makeUser({ profiles: [makeProfile()] }),
      organizations: [makeOrganization()],
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    // "Acme Fintech" legitimately renders twice: the profile's own org-name
    // span and the grant-form's dropdown option — scoped to the former.
    expect(
      await screen.findByText("Acme Fintech", { selector: ".titan-role-assignment__org-name" }),
    ).toBeInTheDocument();
    // "Member" also legitimately renders twice: the RoleBadge and the role
    // <select>'s own option — scoped to the badge.
    expect(screen.getByText("Member", { selector: ".titan-badge" })).toBeInTheDocument();
  });

  it("renders real assigned leads and created assessments as deep links", async () => {
    mockUserBackend({
      user: makeUser(),
      assignedLeads: [makeLead()],
      createdAssessments: [makeAssessment()],
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    const leadLink = await screen.findByRole("link", { name: "Priya Sharma" });
    expect(leadLink).toHaveAttribute("href", "/admin/leads/lead_1");
    const assessmentLink = screen.getByRole("link", { name: /a1b2c3d4 — dpdp v1.0.0/ });
    expect(assessmentLink).toHaveAttribute(
      "href",
      "/admin/assessments/a1b2c3d4-0000-0000-0000-000000000001",
    );
  });

  it("renders the real audit trail for this user as a timeline", async () => {
    mockUserBackend({
      user: makeUser(),
      auditEvents: [
        {
          id: "e1",
          actorId: "admin_1",
          organizationId: null,
          action: "user.viewed",
          entityType: "user",
          entityId: "user_1",
          metadata: null,
          createdAt: "2026-07-20T00:00:00.000Z",
        },
      ],
    });
    renderDetail();
    expect(await screen.findByText("User viewed")).toBeInTheDocument();
  });

  it("grants a new role via the Role Assignment panel and reflects it after refetch", async () => {
    const user = userEvent.setup();
    let grantedBody: Record<string, unknown> | undefined;
    mockUserBackend({
      user: makeUser(),
      organizations: [makeOrganization()],
      onGrant: (body) => {
        grantedBody = body as Record<string, unknown>;
      },
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Asha Rao" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Organization" }), "org_1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "admin");
    await user.click(screen.getByRole("button", { name: "Grant role" }));

    await vi.waitFor(() => {
      expect(grantedBody).toEqual({ organizationId: "org_1", role: "admin" });
    });
    expect(
      await screen.findByText("Acme Fintech", { selector: ".titan-role-assignment__org-name" }),
    ).toBeInTheDocument();
  });

  it("revokes a role via the Role Assignment panel and reflects the removal after refetch", async () => {
    const user = userEvent.setup();
    let revokedId: string | undefined;
    mockUserBackend({
      user: makeUser({ profiles: [makeProfile()] }),
      organizations: [makeOrganization()],
      onRevoke: (profileId) => {
        revokedId = profileId;
      },
    });
    renderDetail();
    await screen.findByText("Acme Fintech", { selector: ".titan-role-assignment__org-name" });

    await user.click(screen.getByRole("button", { name: "Revoke" }));

    await vi.waitFor(() => expect(revokedId).toBe("profile_1"));
    await vi.waitFor(() => {
      expect(
        screen.getByText("This user has no organization or platform roles yet."),
      ).toBeInTheDocument();
    });
  });
});

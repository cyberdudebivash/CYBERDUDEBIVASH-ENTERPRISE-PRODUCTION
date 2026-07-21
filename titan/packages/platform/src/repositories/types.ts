import type { Answers, AssessmentResult } from "@titan/assessment-core";

/** CRM-style lead lifecycle (EAP-2). A small, fixed vocabulary — not a
 * freeform string — so every consumer (filters, badges, board columns in a
 * future phase) can rely on a closed set rather than defending against
 * arbitrary values. */
export type LeadStatus = "new" | "contacted" | "qualified" | "disqualified" | "converted";
export type LeadPriority = "low" | "medium" | "high" | "urgent";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
];
export const LEAD_PRIORITIES: readonly LeadPriority[] = ["low", "medium", "high", "urgent"];

export interface LeadRecord {
  id: string;
  organizationId: string | null;
  assessmentId: string | null;
  name: string;
  email: string;
  company: string;
  answers: Answers;
  result: AssessmentResult;
  timestamp: string;
  source: string;
  /** EAP-2 lifecycle fields — see migrations/0008_lead_lifecycle.sql. Always
   * present (never optional) on a saved record: `save` applies real
   * defaults ('new'/'medium'/null/[]) for the public scan flow, which never
   * sets any of these itself. */
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo: string | null;
  tags: string[];
}

/** What's known before a repository assigns an id. Lifecycle fields are
 * optional here — `POST /api/leads` (the public, unauthenticated scan flow)
 * never sets them; the repository defaults them on save. */
export type NewLead = Omit<
  LeadRecord,
  "id" | "organizationId" | "assessmentId" | "status" | "priority" | "assignedTo" | "tags"
> &
  Partial<
    Pick<
      LeadRecord,
      "organizationId" | "assessmentId" | "status" | "priority" | "assignedTo" | "tags"
    >
  >;

/** A partial lifecycle update (EAP-2's `PATCH /api/leads/:id`) — deliberately
 * excludes name/email/company/answers/result: those are what the lead
 * *submitted*, immutable once captured, not something an admin edits. */
export interface LeadLifecyclePatch {
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedTo?: string | null;
  tags?: string[];
}

export type LeadSortField = "createdAt" | "name" | "company" | "riskScore" | "status" | "priority";

export interface LeadSearchOptions {
  /** Case-insensitive substring match against name/email/company. */
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  /** A real user id, or the sentinel "unassigned" for `assignedTo IS NULL`. */
  assignedTo?: string;
  sortBy?: LeadSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface LeadSearchResult {
  leads: LeadRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// Business logic (the Worker's router, and titan/apps/web once Workstream 7 wires
// it up) depends on this interface only — never on D1 directly (DECISION_LOG.md).
// leadRepository.memory.ts and leadRepository.d1.ts are two interchangeable
// implementations of it, proven interchangeable by leadRepository.contract.ts.
export interface LeadRepository {
  save(lead: NewLead): Promise<LeadRecord>;
  /** Unfiltered, full list — kept exactly as-is (EAP-1's Dashboard already
   * depends on this shape) rather than folding pagination/filtering into
   * it. `search` (EAP-2) is the new, separate entry point for the Lead
   * Workspace's filtered/paginated view — see DECISION_LOG.md. */
  list(): Promise<LeadRecord[]>;
  findById(id: string): Promise<LeadRecord | null>;
  /** Returns null if no lead with this id exists — mirrors
   * AssessmentRepository.findById's null-not-throw contract. */
  update(id: string, patch: LeadLifecyclePatch): Promise<LeadRecord | null>;
  search(options: LeadSearchOptions): Promise<LeadSearchResult>;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export type NewOrganization = Omit<OrganizationRecord, "id">;

export interface OrganizationRepository {
  save(organization: NewOrganization): Promise<OrganizationRecord>;
  findBySlug(slug: string): Promise<OrganizationRecord | null>;
  list(): Promise<OrganizationRecord[]>;
}

/** RBAC + org-membership foundation (Workstream 5/6). Kept deliberately small:
 * one role string per (user, organization) pair, not a permissions matrix —
 * matching Workstream 5's "RBAC foundation", not full enterprise RBAC. */
export type UserRole = "owner" | "admin" | "member";

export interface UserProfileRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  role: UserRole;
  createdAt: string;
}

export type NewUserProfile = Omit<UserProfileRecord, "id">;

export interface UserProfileRepository {
  save(profile: NewUserProfile): Promise<UserProfileRecord>;
  findByUserId(userId: string): Promise<UserProfileRecord[]>;
}

export interface AssessmentRecord {
  id: string;
  organizationId: string | null;
  createdBy: string | null;
  framework: string;
  frameworkVersion: string;
  answers: Answers;
  result: AssessmentResult;
  createdAt: string;
}

export type NewAssessment = Omit<AssessmentRecord, "id">;

export interface AssessmentRepository {
  save(assessment: NewAssessment): Promise<AssessmentRecord>;
  findById(id: string): Promise<AssessmentRecord | null>;
  list(): Promise<AssessmentRecord[]>;
}

export interface AuditEventRecord {
  id: string;
  actorId: string | null;
  organizationId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type NewAuditEvent = Omit<AuditEventRecord, "id">;

/** EAP-2: an optional narrowing of `list()` to one entity's own trail (e.g.
 * a single lead's activity/audit history) — backed by the real
 * `(entity_type, entity_id)` index migrations/0007 already created
 * anticipating exactly this, not a speculative addition. */
export interface AuditListFilter {
  entityType?: string;
  entityId?: string;
}

export interface AuditRepository {
  record(event: NewAuditEvent): Promise<AuditEventRecord>;
  /** No filter (or an empty one): every event, newest first — EAP-1's
   * Dashboard audit summary and the existing GET /api/audit both rely on
   * this exact no-args behavior, unchanged. */
  list(filter?: AuditListFilter): Promise<AuditEventRecord[]>;
}

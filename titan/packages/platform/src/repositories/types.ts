import type { Answers, AssessmentResult, RiskLevel } from "@titan/assessment-core";

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
  /** EAP-3: narrows to the one assessment a lead links to
   * (`LeadRecord.assessmentId`) — backs Assessment Details' "Lead linkage"
   * panel. Exact match, not a substring — an assessment id is opaque, never
   * partially typed by a caller the way `search` is. */
  assessmentId?: string;
  /** EAP-4: narrows to one organization's own leads — backs Organization
   * Relationships' "associated leads" panel. Same exact-match reasoning as
   * `assessmentId`. */
  organizationId?: string;
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

/** EAP-4: a closed, two-value lifecycle — an organization is archived and
 * restorable, never deleted (no repository here has a `delete`, matching
 * `audit_events`' own append-only guarantee — DECISION_LOG.md). */
export type OrganizationStatus = "active" | "archived";

export const ORGANIZATION_STATUSES: readonly OrganizationStatus[] = ["active", "archived"];

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  /** EAP-4 (migrations/0009_organization_lifecycle.sql). Defaults to
   * "active" for every organization saved before archive/restore existed. */
  status: OrganizationStatus;
  /** EAP-4. Free text, nullable — not every organization has a captured
   * industry yet; NULL means "unknown", never an empty string. */
  industry: string | null;
  region: string | null;
  /** EAP-4. Same reasoning and shape as `LeadRecord.tags` — a small,
   * freeform label set, not a controlled vocabulary. */
  tags: string[];
  createdAt: string;
  /** EAP-4. Repository-owned (never caller-supplied, unlike `createdAt`) —
   * set to `createdAt` on `save`, refreshed to "now" on every `update`. It
   * exists so the Organization Workspace has a real "last activity" column
   * without joining `audit_events`; letting a caller set their own
   * "last modified" would make that column meaningless. */
  updatedAt: string;
}

/** `status` defaults to "active" and `updatedAt` is repository-assigned
 * (mirrors `createdAt`) — neither is ever supplied by a caller, unlike
 * `NewLead`/`NewAssessment` where every field but `id` is caller-supplied.
 * There is no anonymous/public organization-creation flow the way leads and
 * assessments have one; every organization is created through the
 * Platform-Administrator-only `POST /api/organizations` (Workstream 5). */
export type NewOrganization = Omit<OrganizationRecord, "id" | "status" | "updatedAt"> & {
  status?: OrganizationStatus;
};

/** EAP-4: a partial administrative update (`PATCH /api/organizations/:id`) —
 * same shape and reasoning as `LeadLifecyclePatch`: every field optional,
 * `industry`/`region` distinguish "leave unchanged" (absent) from "clear it"
 * (present as null) at the router's validation layer, same as
 * `LeadLifecyclePatch.assignedTo`. `name`/`slug` are deliberately excluded
 * from `status`-only actions (archive/restore) but included here since,
 * unlike a lead's captured name/email/company, an organization's own name is
 * administrative metadata an owner is expected to correct over time. */
export interface OrganizationPatch {
  name?: string;
  status?: OrganizationStatus;
  industry?: string | null;
  region?: string | null;
  tags?: string[];
}

export type OrganizationSortField = "name" | "createdAt" | "updatedAt";

/** EAP-4: the Organization Workspace's server-side search — same shape and
 * reasoning as `LeadSearchOptions`/`AssessmentSearchOptions`, scoped to
 * fields the `organizations` table itself actually has. Deliberately no
 * `riskLevel` or `assessmentStatus` filter here: both would require a
 * cross-repository join against assessments, which every repository in this
 * system (Lead, Assessment, Organization, Audit, UserProfile) is
 * structurally unable to do today — each is constructed independently with
 * its own private store, in-memory and D1 alike (`ARCHITECTURE.md`'s
 * Repository Pattern), and there is no precedent anywhere in this codebase
 * for one repository depending on another's data. Threading assessments
 * into organization search would be a real architectural change, not an
 * additive extension, for a query volume (organization counts, not lead/
 * assessment counts) that doesn't justify it. `assessmentStatus` also has no
 * backing field at all — assessments have no status/lifecycle
 * (`AssessmentRecord` is one immutable row per completed run) — so it would
 * be inventing a concept that doesn't exist rather than exposing a real
 * one. Risk information is surfaced instead at the single-organization
 * scope Workstream 3 (Organization Health) actually asks for, via
 * `AssessmentSearchOptions.organizationId` — see `useOrganizationHealth`. */
export interface OrganizationSearchOptions {
  /** Case-insensitive substring match against name/slug/industry/region. */
  search?: string;
  status?: OrganizationStatus;
  industry?: string;
  region?: string;
  /** Exact match against one tag in the organization's tag list. */
  tag?: string;
  sortBy?: OrganizationSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface OrganizationSearchResult {
  organizations: OrganizationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrganizationRepository {
  save(organization: NewOrganization): Promise<OrganizationRecord>;
  findBySlug(slug: string): Promise<OrganizationRecord | null>;
  /** EAP-4: single-record lookup by id — backs Organization Details and
   * every administrative write, same null-not-throw contract as
   * `LeadRepository.findById`/`AssessmentRepository.findById`. */
  findById(id: string): Promise<OrganizationRecord | null>;
  /** Unfiltered, full list — kept exactly as-is (EAP-1's Dashboard already
   * depends on this shape), same split as `LeadRepository.list`/`search`. */
  list(): Promise<OrganizationRecord[]>;
  search(options: OrganizationSearchOptions): Promise<OrganizationSearchResult>;
  /** Returns null if no organization with this id exists — mirrors
   * `LeadRepository.update`'s null-not-throw contract. */
  update(id: string, patch: OrganizationPatch): Promise<OrganizationRecord | null>;
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

export type AssessmentSortField = "createdAt" | "riskScore" | "framework";

/** EAP-3: the Assessment Workspace's server-side search — same shape and
 * reasoning as `LeadSearchOptions` (EAP-2). `search` matches the fields an
 * assessment actually has an identity through — it has no name/email/company
 * the way a lead does, so this is a substring match against
 * id/organizationId/createdBy rather than a business-facing field. */
export interface AssessmentSearchOptions {
  search?: string;
  framework?: string;
  riskLevel?: RiskLevel;
  /** EAP-4: narrows to one organization's own assessments — backs
   * Organization Relationships' "associated assessments" panel. Same
   * exact-match reasoning as `LeadSearchOptions.assessmentId`. */
  organizationId?: string;
  sortBy?: AssessmentSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface AssessmentSearchResult {
  assessments: AssessmentRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssessmentRepository {
  save(assessment: NewAssessment): Promise<AssessmentRecord>;
  findById(id: string): Promise<AssessmentRecord | null>;
  /** Unfiltered, full list — kept exactly as-is (EAP-1's Dashboard and
   * EAP-3's Compliance Intelligence panel both depend on this shape) rather
   * than folding pagination/filtering into it, same reasoning as
   * `LeadRepository.list`/`search`'s split (DECISION_LOG.md). */
  list(): Promise<AssessmentRecord[]>;
  search(options: AssessmentSearchOptions): Promise<AssessmentSearchResult>;
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

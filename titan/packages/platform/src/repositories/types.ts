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

/** EAP-5: query-param/request-body validation list, same role as
 * `LEAD_STATUSES`/`ORGANIZATION_STATUSES` — a fixed, explicit array so an
 * unrecognized role string is a real 400, not silently coerced. */
export const USER_ROLES: readonly UserRole[] = ["owner", "admin", "member"];

export interface UserProfileRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  role: UserRole;
  createdAt: string;
}

export type NewUserProfile = Omit<UserProfileRecord, "id">;

/** EAP-5: a role reassignment (`PATCH /api/users/:id/profiles/:profileId`) —
 * `role` is the only mutable field. Unlike `organizationId`, changing which
 * organization a grant belongs to isn't "updating" it, it's a different
 * grant entirely — `save`/`remove` cover creating and revoking one. */
export interface UserProfilePatch {
  role: UserRole;
}

export interface UserProfileRepository {
  save(profile: NewUserProfile): Promise<UserProfileRecord>;
  findByUserId(userId: string): Promise<UserProfileRecord[]>;
  /** EAP-5: single-record lookup by the profile's own id — backs Role
   * Assignment's update/revoke actions, same null-not-throw contract as
   * every other repository's `findById`. */
  findById(id: string): Promise<UserProfileRecord | null>;
  /** EAP-5: every profile system-wide, unfiltered — backs the
   * last-Platform-Administrator guard (`router.ts`'s
   * `wouldRemoveLastPlatformAdministrator`), which needs to count every
   * `organizationId: null, role: "owner"` profile across every user, not
   * just one user's or one organization's own. No caller needs this sorted
   * or paginated (it's a guard check, not a listing UI), so it stays exactly
   * as small as `LeadRepository.list`'s own unfiltered shape. */
  list(): Promise<UserProfileRecord[]>;
  /** EAP-5: role reassignment — same null-not-throw contract as
   * `LeadRepository.update`/`OrganizationRepository.update`. */
  update(id: string, patch: UserProfilePatch): Promise<UserProfileRecord | null>;
  /** EAP-5: revokes a membership/grant — this repository's one real
   * deletion, deliberately different from every other repository in this
   * system (Lead/Assessment/Organization/Audit never delete anything). A
   * `UserProfileRecord` is a thin (user, organization, role) grant with no
   * dependent data of its own — unlike an organization (real linked leads/
   * assessments) or a lead (a real business record), there is nothing here
   * an archive-not-delete pattern would actually be preserving. The audit
   * trail (`user.role_revoked`, written before this runs) is what preserves
   * the historical record; this table only ever reflects current grants.
   * Returns `false` (not an error) if the id doesn't exist — the caller
   * already resolved the record before calling this, so a false here would
   * only mean a concurrent revoke raced it, not a caller bug. */
  remove(id: string): Promise<boolean>;
}

/** EAP-5: read-only view over Auth.js's own `users` table
 * (migrations/0001_authjs_core.sql) — the real identity record (name/email),
 * distinct from `UserProfileRecord` (this application's own role/membership
 * grants). Deliberately has no `save`: the `@auth/d1-adapter` is the only
 * writer to `users` (a session provider's real sign-in creates the row) —
 * inventing a parallel user-creation path here would fabricate an identity
 * with no real authenticated principal behind it, which this system's own
 * "never fabricate implementation" discipline rules out. A user's name/email
 * are therefore never edited through this application either (they belong to
 * whichever OAuth/email provider authenticated them) — only their
 * `UserProfileRecord`s (role/organization grants) are administrable. */
export interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  /** ISO 8601, or null if unverified — mirrors the adapter's own
   * `emailVerified` column exactly (a `datetime`, not a boolean). */
  emailVerified: string | null;
  image: string | null;
}

export type UserSortField = "name" | "email";

/** EAP-5: the User Workspace's server-side search — same shape and reasoning
 * as `OrganizationSearchOptions`, scoped to the two identity fields `users`
 * actually has. No `organizationId`/`role` filter here deliberately: those
 * live on a different repository (`UserProfileRecord`), and every other
 * repository in this system is constructed independently with its own
 * private store (`ARCHITECTURE.md`'s Repository Pattern) — the same
 * cross-repository-join line `DECISION_LOG.md`'s EAP-4 entry already drew
 * for Organization search and `riskLevel`. */
export interface UserSearchOptions {
  /** Case-insensitive substring match against name/email. */
  search?: string;
  sortBy?: UserSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface UserSearchResult {
  users: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  search(options: UserSearchOptions): Promise<UserSearchResult>;
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
  /** EAP-5: narrows to one user's own created assessments — backs User
   * Relationships' "assessments created by this user" panel, the same
   * exact-match reasoning as `organizationId` above (a real column every
   * assessment already carries, not a new concept). Distinct from `search`,
   * which only ever substring-matches `createdBy` alongside id/
   * organizationId — a caller that already knows the exact user id (this
   * panel does) shouldn't depend on substring semantics happening to behave
   * like an exact match. */
  createdBy?: string;
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

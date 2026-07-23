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
  /** COM-1: every real member of one organization, regardless of which user
   * — backs Commercial's "seat usage" (a subscription's own seat count is
   * the live number of this organization's own `user_profiles` rows, not a
   * separately tracked counter that could drift from the real membership
   * list). The mirror image of `findByUserId`: that finds one user's
   * memberships across every organization, this finds one organization's
   * members across every user. */
  findByOrganizationId(organizationId: string): Promise<UserProfileRecord[]>;
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

/** EAP-6: `createdAt` is the only sortable field this system's audit trail
 * actually has an opinion about ordering by — there is no numeric/business
 * field on an audit event the way `riskScore`/`name` are for Lead/
 * Organization, so unlike those `SortField` unions this one has exactly one
 * member. Kept as its own type (not a hardcoded literal) purely for
 * consistency with every other `*SortField` union's shape. */
export type AuditSortField = "createdAt";

/** EAP-6: the Enterprise Audit Center's server-side search — same shape and
 * reasoning as `OrganizationSearchOptions`/`UserSearchOptions`, scoped to the
 * fields `audit_events` actually has. Deliberately no "result status"
 * filter: this table has no outcome/status column at all (every recorded
 * event is, by construction, a successful authorized action — a denied or
 * failed request is never written here), so exposing one would invent a
 * concept the data model doesn't support. */
export interface AuditSearchOptions {
  /** Case-insensitive substring match against action/entityType/entityId. */
  search?: string;
  actorId?: string;
  organizationId?: string;
  /** Exact match — the fixed `entity.verb` vocabulary every `recordAuditEvent`
   * call site already uses (e.g. "lead.created"), not a substring. */
  action?: string;
  entityType?: string;
  entityId?: string;
  /** Inclusive ISO 8601 lower bound on `createdAt`. */
  dateFrom?: string;
  /** Inclusive ISO 8601 upper bound on `createdAt`. */
  dateTo?: string;
  sortBy?: AuditSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface AuditSearchResult {
  events: AuditEventRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditRepository {
  record(event: NewAuditEvent): Promise<AuditEventRecord>;
  /** No filter (or an empty one): every event, newest first — EAP-1's
   * Dashboard audit summary and the existing GET /api/audit both rely on
   * this exact no-args behavior, unchanged. */
  list(filter?: AuditListFilter): Promise<AuditEventRecord[]>;
  /** EAP-6: the Audit Workspace's filtered/paginated/sorted view over the
   * same table `list()` already reads — same split as
   * `OrganizationRepository.list`/`.search`, kept as a genuinely separate
   * entry point rather than folding pagination into `list()`, which
   * Dashboard and every per-entity audit panel already depend on returning
   * a plain unfiltered/unpaginated array. */
  search(options: AuditSearchOptions): Promise<AuditSearchResult>;
}

// CPP-1: Support Requests — the one genuinely new entity the Customer
// Portal needs (everything else it shows is composed from repositories
// that already exist). Originally a closed single-value ("open") status
// with no admin-side resolution endpoint anywhere in this codebase — see
// git history for that original reasoning. The 2026-07-23
// production-readiness audit (DECISION_LOG.md) found the deferred
// "Administration Console" follow-up this comment used to point at was a
// real, live gap: every customer support request went into a queue no
// admin could ever see or close. `"resolved"` below or an admin-facing
// search/update capability were not needed until the Admin Support Queue
// (this same audit's Workstream 15) made itself real.
export const SUPPORT_REQUEST_STATUSES = ["open", "resolved"] as const;
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export interface SupportRequestRecord {
  id: string;
  /** Nullable for the same reason `AssessmentRecord.organizationId` is —
   * a caller with no organization membership can't reach any CPP-1 portal
   * route to create one (`resolvePortalOrganizationId`, router.ts), but the
   * column stays nullable rather than assumed-always-present, matching
   * every other organization-scoped record in this schema. */
  organizationId: string | null;
  createdBy: string;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
}

export type NewSupportRequest = Omit<SupportRequestRecord, "id" | "status"> & {
  status?: SupportRequestStatus;
};

/** Admin Support Queue's own patch shape — deliberately just `status`, the
 * one field an administrator actually resolves a ticket by changing.
 * Mirrors `LeadLifecyclePatch`'s own "narrow, admin-settable subset" shape
 * rather than accepting `Partial<SupportRequestRecord>`, which would let a
 * caller silently rewrite `subject`/`message`/`createdBy` — a customer's
 * own words, not something an administrator should be able to edit. */
export interface SupportRequestPatch {
  status: SupportRequestStatus;
}

export interface SupportRequestSearchOptions {
  /** Case-insensitive substring match against subject/message. */
  search?: string;
  status?: SupportRequestStatus;
  /** Admin Support Queue's own cross-organization view needs to narrow to
   * one organization (same reasoning as `LeadSearchOptions.organizationId`
   * backing Organization Relationships' own panel) — exact match, not a
   * substring. */
  organizationId?: string;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface SupportRequestSearchResult {
  requests: SupportRequestRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupportRequestRepository {
  save(request: NewSupportRequest): Promise<SupportRequestRecord>;
  /** No unfiltered `list()` — mirrors `LeadRepository`'s own split between
   * an unfiltered read with a real existing consumer (there is none here)
   * and `search`, the Admin Support Queue's actual entry point. */
  listByUser(userId: string): Promise<SupportRequestRecord[]>;
  findById(id: string): Promise<SupportRequestRecord | null>;
  /** Returns null if no request with this id exists — mirrors
   * `LeadRepository.update`'s null-not-throw contract. */
  update(id: string, patch: SupportRequestPatch): Promise<SupportRequestRecord | null>;
  /** The Admin Support Queue's own search/filter/paginate entry point —
   * cross-organization, Platform-Administrator-only at the router layer
   * (`requirePlatformAdministrator`), the same authority/shape split
   * `LeadRepository.search` already established for EAP-2. */
  search(options: SupportRequestSearchOptions): Promise<SupportRequestSearchResult>;
}

// COM-1: Commercial Platform. Subscriptions and Licenses are the two
// genuinely new entities — everything else (Plans, Entitlements) is
// computed from these plus the code-defined plan catalog
// (`commercial/planCatalog.ts`), never persisted separately. Provider-
// agnostic by design: no payment amount, invoice, or card/token field
// exists anywhere in either record — a real billing provider integration
// would plug into the lifecycle these model, not be modeled itself.

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "canceled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionRecord {
  id: string;
  /** Not nullable, unlike `AssessmentRecord.organizationId` — there is no
   * anonymous-flow analogue for a subscription; every one is created
   * through an authenticated organization member or a Platform
   * Administrator acting on a real organization's behalf. One subscription
   * per organization (`findByOrganizationId` returns at most one) — this
   * system has no multi-subscription-per-tenant concept. */
  organizationId: string;
  /** A `PlanId` from `commercial/planCatalog.ts`'s `PLAN_CATALOG`, stored as
   * a plain string (not re-typed here) so this repository has no
   * compile-time dependency on the catalog module — the same "repository
   * types don't import business logic" boundary `AssessmentRecord.framework`
   * already keeps as a plain string rather than importing
   * `@titan/assessment-core`'s own framework union. */
  planId: string;
  status: SubscriptionStatus;
  /** ISO 8601, or null once a trial has converted (or the plan never had
   * one — `Plan.trialDays === 0`). */
  trialEndsAt: string | null;
  /** ISO 8601 — when the current term ends and renewal (or expiry) is due.
   * Server-computed on every create/renew (`router.ts`), never
   * client-supplied — the same "never trust a client value for a business
   * date" discipline `POST /api/leads`'s server-side score recomputation
   * already established. */
  currentPeriodEnd: string | null;
  /** The currency this subscription bills in — chosen once, at first real
   * checkout, and fixed for the subscription's lifetime (every renewal
   * charge, automated or self-service, stays in this currency; changing it
   * mid-subscription is a cancel-and-resubscribe, not a patch).
   * `commercial/planCatalog.ts`'s `Currency`, stored as a plain string for
   * the same "repository types don't import business logic" reason `planId`
   * already is. Defaults to `"INR"` for a free-trial subscription that has
   * never gone through checkout — real for a converted/paid subscription. */
  currency: string;
  /** Razorpay's own Subscription id (`sub_...`) once a real recurring
   * mandate exists — `null` for a free trial that has never converted.
   * `router.ts`'s webhook handler resolves incoming `subscription.*` events
   * back to this row through this id, since Razorpay's recurring webhooks
   * carry a subscription id, never this repository's own `id`. */
  providerSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
}

export type NewSubscription = Omit<
  SubscriptionRecord,
  "id" | "updatedAt" | "canceledAt" | "providerSubscriptionId"
>;

/** A partial lifecycle update (`PATCH /api/portal/commercial/subscription`,
 * `PATCH /api/commercial/subscriptions/:id`) — `router.ts` diffs this
 * against the pre-update record to decide which real event
 * (`subscription.upgraded`/`.downgraded`/`.canceled`/`.renewed`) to record,
 * the same pattern `OrganizationPatch`/`LeadLifecyclePatch` already
 * established. */
export interface SubscriptionPatch {
  planId?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  currency?: string;
  providerSubscriptionId?: string | null;
}

export type SubscriptionSortField = "createdAt" | "currentPeriodEnd";

/** Admin-facing cross-organization search (`GET /api/commercial/subscriptions/search`)
 * — same shape and reasoning as `OrganizationSearchOptions`. */
export interface SubscriptionSearchOptions {
  /** Case-insensitive substring match against organizationId/planId. */
  search?: string;
  status?: SubscriptionStatus;
  planId?: string;
  sortBy?: SubscriptionSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface SubscriptionSearchResult {
  subscriptions: SubscriptionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubscriptionRepository {
  save(subscription: NewSubscription): Promise<SubscriptionRecord>;
  /** The one real per-tenant lookup — backs every `/api/portal/commercial/*`
   * route (CPP-1's own `resolvePortalOrganizationId` resolves the
   * organization; this resolves that organization's own subscription, or
   * null if it never subscribed to anything). */
  findByOrganizationId(organizationId: string): Promise<SubscriptionRecord | null>;
  findById(id: string): Promise<SubscriptionRecord | null>;
  /** Resolves a Razorpay recurring webhook event's own `subscription_id`
   * back to the local row it belongs to — the one lookup
   * `POST /api/webhooks/razorpay` needs that neither `findById` (a
   * different id space) nor `findByOrganizationId` (the webhook payload
   * carries no organization id at all) can answer. */
  findByProviderSubscriptionId(providerSubscriptionId: string): Promise<SubscriptionRecord | null>;
  search(options: SubscriptionSearchOptions): Promise<SubscriptionSearchResult>;
  update(id: string, patch: SubscriptionPatch): Promise<SubscriptionRecord | null>;
}

export const LICENSE_STATUSES = ["active", "expired"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

/** COM-1: the seat grant itself — a subscription's own "how many seats,
 * currently active or expired". Deliberately not "one row per seat/user":
 * seat *usage* is the live count of an organization's own real
 * `UserProfileRecord`s (`UserProfileRepository.findByOrganizationId`), not
 * a separately tracked assignment table that could drift from real
 * membership — the same "compose from the existing repository, don't
 * duplicate its data" discipline CPP-1's `PortalComplianceSummary` already
 * established for assessment counts. */
export interface LicenseRecord {
  id: string;
  organizationId: string;
  subscriptionId: string;
  seatLimit: number;
  status: LicenseStatus;
  activatedAt: string;
  /** ISO 8601, or null while the license is active with no scheduled end
   * (mirrors the subscription's own `currentPeriodEnd` once it exists). */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewLicense = Omit<LicenseRecord, "id" | "updatedAt">;

export interface LicensePatch {
  seatLimit?: number;
  status?: LicenseStatus;
  expiresAt?: string | null;
}

export type LicenseSortField = "createdAt" | "seatLimit";

export interface LicenseSearchOptions {
  search?: string;
  status?: LicenseStatus;
  sortBy?: LicenseSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface LicenseSearchResult {
  licenses: LicenseRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LicenseRepository {
  save(license: NewLicense): Promise<LicenseRecord>;
  findByOrganizationId(organizationId: string): Promise<LicenseRecord | null>;
  findById(id: string): Promise<LicenseRecord | null>;
  /** Admin-facing "License Inventory" (`GET /api/commercial/licenses/search`)
   * — same shape and reasoning as `SubscriptionSearchOptions`. */
  search(options: LicenseSearchOptions): Promise<LicenseSearchResult>;
  update(id: string, patch: LicensePatch): Promise<LicenseRecord | null>;
}

export const BILLING_TRANSACTION_STATUSES = ["created", "paid", "failed"] as const;
export type BillingTransactionStatus = (typeof BILLING_TRANSACTION_STATUSES)[number];

/** Real payment-provider integration: one row per real Razorpay order
 * attempt, kept deliberately separate from `SubscriptionRecord`/
 * `LicenseRecord` (COM-1) rather than adding payment fields to either — see
 * migrations/0013_billing_transactions.sql's own comment. `providerPaymentId`/
 * `providerSignature` are null until a real checkout completes and its
 * signature is verified server-side; `status` only ever becomes `"paid"`
 * after that verification succeeds, never on an unverified client claim. */
export interface BillingTransactionRecord {
  id: string;
  organizationId: string;
  subscriptionId: string;
  planId: string;
  /** Only one provider exists today — a literal, not an enum with
   * speculative future members, the same "real values only" discipline
   * `Plan.id`/`SubscriptionStatus` already follow. */
  provider: "razorpay";
  /** Set for a one-time Orders-mode transaction, `null` for a
   * subscription-mode one — Razorpay's real Subscriptions Checkout success
   * callback returns `razorpay_payment_id`/`razorpay_subscription_id`/
   * `razorpay_signature`, never an order id (verified against Razorpay's
   * documented contract, not assumed the same as Orders-mode checkout).
   * Exactly one of `providerOrderId`/`providerSubscriptionId` is set for any
   * real transaction — never both, never neither. */
  providerOrderId: string | null;
  /** Set for a subscription-mode transaction (the first authorization charge
   * or a recurring `subscription.charged` webhook event) — `null` for a
   * one-time Orders-mode transaction. See `providerOrderId`'s own comment. */
  providerSubscriptionId: string | null;
  providerPaymentId: string | null;
  providerSignature: string | null;
  /** The smallest currency unit (paise for INR, cents for USD/EUR/GBP —
   * Razorpay's own convention for every currency it supports, not an
   * INR-specific field despite the name) — and the same "never a float for
   * money" discipline this avoids by construction. Always the
   * server-resolved plan price in `currency` below, never a client-submitted
   * amount. */
  amountPaise: number;
  currency: string;
  status: BillingTransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export type NewBillingTransaction = Omit<BillingTransactionRecord, "id" | "updatedAt">;

export interface BillingTransactionPatch {
  providerPaymentId?: string;
  providerSignature?: string;
  status?: BillingTransactionStatus;
}

// Real recurring billing: Razorpay's own webhook delivery is documented
// at-least-once, not exactly-once — a slow handler, a transient 5xx, or a
// network blip all cause a real, legitimate redelivery of the same event.
// One row per (provider, provider_event_id) recorded before the event is
// acted on is what makes `POST /api/webhooks/razorpay` idempotent: a
// replayed `subscription.charged` can never grant a second billing period.
export interface WebhookEventRecord {
  id: string;
  provider: "razorpay";
  providerEventId: string;
  eventType: string;
  receivedAt: string;
}

export type NewWebhookEvent = Omit<WebhookEventRecord, "id">;

export interface WebhookEventRepository {
  /** `true` if this is the first time this exact `(provider,
   * providerEventId)` pair has been recorded — records it as a side effect
   * either way, so the caller's very next line can safely act on the event
   * only when this returns `true`. A single atomic INSERT ... ON CONFLICT,
   * not a separate exists-check-then-insert, so two concurrent deliveries of
   * the same event can never both observe "not yet seen". */
  recordIfNew(event: NewWebhookEvent): Promise<boolean>;
}

export type BillingTransactionSortField = "createdAt";

export interface BillingTransactionSearchOptions {
  organizationId?: string;
  status?: BillingTransactionStatus;
  sortBy?: BillingTransactionSortField;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface BillingTransactionSearchResult {
  transactions: BillingTransactionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BillingTransactionRepository {
  save(transaction: NewBillingTransaction): Promise<BillingTransactionRecord>;
  findById(id: string): Promise<BillingTransactionRecord | null>;
  /** The one lookup the Orders-mode verify step needs — Razorpay's own
   * one-time checkout callback returns `razorpay_order_id`, not this
   * repository's internal id, so verification has to resolve from that
   * value. */
  findByProviderOrderId(providerOrderId: string): Promise<BillingTransactionRecord | null>;
  /** The equivalent lookup for a Subscriptions-mode transaction — Razorpay's
   * real recurring checkout/webhook payloads carry a subscription id, never
   * an order id (see `BillingTransactionRecord.providerSubscriptionId`'s own
   * comment). */
  findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<BillingTransactionRecord | null>;
  /** Real access-gating relies on this: "does this organization have at
   * least one paid transaction" (`router.ts`'s scanner entitlement check),
   * not on subscription status alone — see that function's own doc
   * comment for why the two are deliberately different checks. */
  search(options: BillingTransactionSearchOptions): Promise<BillingTransactionSearchResult>;
  update(id: string, patch: BillingTransactionPatch): Promise<BillingTransactionRecord | null>;
}

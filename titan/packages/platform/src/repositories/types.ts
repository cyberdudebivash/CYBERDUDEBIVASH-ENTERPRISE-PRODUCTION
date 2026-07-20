import type { Answers, AssessmentResult } from "@titan/assessment-core";

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
}

/** What's known before a repository assigns an id. */
export type NewLead = Omit<LeadRecord, "id" | "organizationId" | "assessmentId"> &
  Partial<Pick<LeadRecord, "organizationId" | "assessmentId">>;

// Business logic (the Worker's router, and titan/apps/web once Workstream 7 wires
// it up) depends on this interface only — never on D1 directly (DECISION_LOG.md).
// leadRepository.memory.ts and leadRepository.d1.ts are two interchangeable
// implementations of it, proven interchangeable by leadRepository.contract.ts.
export interface LeadRepository {
  save(lead: NewLead): Promise<LeadRecord>;
  list(): Promise<LeadRecord[]>;
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

export interface AuditRepository {
  record(event: NewAuditEvent): Promise<AuditEventRecord>;
  list(): Promise<AuditEventRecord[]>;
}

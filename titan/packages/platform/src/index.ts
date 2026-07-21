export type {
  LeadRecord,
  LeadRepository,
  NewLead,
  LeadStatus,
  LeadPriority,
  LeadLifecyclePatch,
  LeadSearchOptions,
  LeadSearchResult,
  LeadSortField,
  OrganizationRecord,
  OrganizationRepository,
  NewOrganization,
  OrganizationStatus,
  OrganizationPatch,
  OrganizationSearchOptions,
  OrganizationSearchResult,
  OrganizationSortField,
  UserRole,
  UserProfileRecord,
  UserProfileRepository,
  UserProfilePatch,
  NewUserProfile,
  UserRecord,
  UserRepository,
  UserSearchOptions,
  UserSearchResult,
  UserSortField,
  AssessmentRecord,
  AssessmentRepository,
  NewAssessment,
  AssessmentSearchOptions,
  AssessmentSearchResult,
  AssessmentSortField,
  AuditEventRecord,
  AuditRepository,
  NewAuditEvent,
  AuditSearchOptions,
  AuditSearchResult,
  AuditSortField,
  SupportRequestRecord,
  SupportRequestRepository,
  NewSupportRequest,
  SupportRequestStatus,
} from "./repositories/types.js";
export {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  ORGANIZATION_STATUSES,
  USER_ROLES,
  SUPPORT_REQUEST_STATUSES,
} from "./repositories/types.js";

export { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
export { createD1LeadRepository } from "./repositories/leadRepository.d1.js";
export { createInMemoryOrganizationRepository } from "./repositories/organizationRepository.memory.js";
export { createD1OrganizationRepository } from "./repositories/organizationRepository.d1.js";
export { createInMemoryUserProfileRepository } from "./repositories/userProfileRepository.memory.js";
export { createD1UserProfileRepository } from "./repositories/userProfileRepository.d1.js";
export { createInMemoryUserRepository } from "./repositories/userRepository.memory.js";
export { createD1UserRepository } from "./repositories/userRepository.d1.js";
export { createInMemoryAssessmentRepository } from "./repositories/assessmentRepository.memory.js";
export { createD1AssessmentRepository } from "./repositories/assessmentRepository.d1.js";
export { createInMemoryAuditRepository } from "./repositories/auditRepository.memory.js";
export { createD1AuditRepository } from "./repositories/auditRepository.d1.js";
export { createInMemorySupportRequestRepository } from "./repositories/supportRequestRepository.memory.js";
export { createD1SupportRequestRepository } from "./repositories/supportRequestRepository.d1.js";

export type { Dependencies, ServiceStatus, SystemOverview, OperationsSummary } from "./router.js";
export type {
  OrganizationsReport,
  LeadsReport,
  AssessmentsReport,
  IdentityReport,
  AuditActionCount,
  AuditReport,
  ExecutiveSummary,
  ReportTrendEntity,
  TrendPoint,
  TrendSeries,
  PortalAssessmentsReport,
  PortalComplianceSummary,
} from "./router.js";
export { handleRequest, REPORT_TREND_ENTITIES } from "./router.js";
export type { Env } from "./worker.js";

export type { AuthConfigOptions, OAuthCredentials } from "./auth/config.js";
export { createAuthConfig } from "./auth/config.js";
export { getSession } from "./auth/session.js";
export { canAccessOrganization, findProfileForOrganization, hasAtLeastRole } from "./auth/rbac.js";
export { requireOrganizationAccess } from "./auth/authorize.js";

export type { Logger, LogFields, LogLevel } from "./observability/logger.js";
export { createLogger } from "./observability/logger.js";
export type { Metrics, RecordedCount, RecordedDuration } from "./observability/metrics.js";
export { createInMemoryMetrics } from "./observability/metrics.js";

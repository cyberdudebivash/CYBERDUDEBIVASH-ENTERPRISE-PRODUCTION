export type {
  LeadRecord,
  LeadRepository,
  NewLead,
  OrganizationRecord,
  OrganizationRepository,
  NewOrganization,
  UserRole,
  UserProfileRecord,
  UserProfileRepository,
  NewUserProfile,
  AssessmentRecord,
  AssessmentRepository,
  NewAssessment,
  AuditEventRecord,
  AuditRepository,
  NewAuditEvent,
} from "./repositories/types.js";

export { createInMemoryLeadRepository } from "./repositories/leadRepository.memory.js";
export { createD1LeadRepository } from "./repositories/leadRepository.d1.js";
export { createInMemoryOrganizationRepository } from "./repositories/organizationRepository.memory.js";
export { createD1OrganizationRepository } from "./repositories/organizationRepository.d1.js";
export { createInMemoryUserProfileRepository } from "./repositories/userProfileRepository.memory.js";
export { createD1UserProfileRepository } from "./repositories/userProfileRepository.d1.js";
export { createInMemoryAssessmentRepository } from "./repositories/assessmentRepository.memory.js";
export { createD1AssessmentRepository } from "./repositories/assessmentRepository.d1.js";
export { createInMemoryAuditRepository } from "./repositories/auditRepository.memory.js";
export { createD1AuditRepository } from "./repositories/auditRepository.d1.js";

export type { Dependencies } from "./router.js";
export { handleRequest } from "./router.js";
export type { Env } from "./worker.js";

export type { AuthConfigOptions, OAuthCredentials } from "./auth/config.js";
export { createAuthConfig } from "./auth/config.js";
export { getSession } from "./auth/session.js";
export { canAccessOrganization, findProfileForOrganization, hasAtLeastRole } from "./auth/rbac.js";
export { requireOrganizationAccess } from "./auth/authorize.js";

export type { Logger, LogFields, LogLevel } from "./observability/logger.js";
export { createLogger } from "./observability/logger.js";
export type { Metrics } from "./observability/metrics.js";
export { createInMemoryMetrics } from "./observability/metrics.js";

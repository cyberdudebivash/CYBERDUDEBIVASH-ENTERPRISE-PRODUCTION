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
  SubscriptionRecord,
  SubscriptionRepository,
  NewSubscription,
  SubscriptionPatch,
  SubscriptionStatus,
  SubscriptionSearchOptions,
  SubscriptionSearchResult,
  SubscriptionSortField,
  LicenseRecord,
  LicenseRepository,
  NewLicense,
  LicensePatch,
  LicenseStatus,
  LicenseSearchOptions,
  LicenseSearchResult,
  LicenseSortField,
  BillingTransactionRecord,
  BillingTransactionRepository,
  NewBillingTransaction,
  BillingTransactionPatch,
  BillingTransactionStatus,
  BillingTransactionSearchOptions,
  BillingTransactionSearchResult,
  BillingTransactionSortField,
} from "./repositories/types.js";
export {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  ORGANIZATION_STATUSES,
  USER_ROLES,
  SUPPORT_REQUEST_STATUSES,
  SUBSCRIPTION_STATUSES,
  LICENSE_STATUSES,
  BILLING_TRANSACTION_STATUSES,
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
export { createInMemorySubscriptionRepository } from "./repositories/subscriptionRepository.memory.js";
export { createD1SubscriptionRepository } from "./repositories/subscriptionRepository.d1.js";
export { createInMemoryLicenseRepository } from "./repositories/licenseRepository.memory.js";
export { createD1LicenseRepository } from "./repositories/licenseRepository.d1.js";
export { createInMemoryBillingTransactionRepository } from "./repositories/billingTransactionRepository.memory.js";
export { createD1BillingTransactionRepository } from "./repositories/billingTransactionRepository.d1.js";

export type {
  Dependencies,
  ServiceStatus,
  SystemOverview,
  OperationsSummary,
  RequestHealthSummary,
} from "./router.js";
export { validateProductionConfig, DEFAULT_ENVIRONMENT_NAME } from "./config/validateEnv.js";
export type { EnvLike, ConfigIssue, ConfigValidationResult } from "./config/validateEnv.js";
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
  PortalCommercialSummary,
} from "./router.js";
export { handleRequest, REPORT_TREND_ENTITIES } from "./router.js";
export type { Env } from "./worker.js";

export type { Plan, PlanEntitlements, PlanId } from "./commercial/planCatalog.js";
export { PLAN_CATALOG, PLAN_IDS, findPlan, isSelfServicePlan } from "./commercial/planCatalog.js";
export { resolveEntitlements } from "./commercial/entitlements.js";
// commercial/razorpay.js is deliberately not exported here: RazorpayCredentials
// carries a real secret (keySecret) that must never be importable into a
// frontend bundle, and createRazorpayOrder/verifyRazorpaySignature have no
// consumer outside router.ts's own handlers.

export type { AuthConfigOptions, OAuthCredentials } from "./auth/config.js";
export { createAuthConfig } from "./auth/config.js";
export { getSession } from "./auth/session.js";
export { canAccessOrganization, findProfileForOrganization, hasAtLeastRole } from "./auth/rbac.js";
export { requireOrganizationAccess } from "./auth/authorize.js";

export type { Logger, LogFields, LogLevel } from "./observability/logger.js";
export { createLogger } from "./observability/logger.js";
export type { Metrics, RecordedCount, RecordedDuration } from "./observability/metrics.js";
export { createInMemoryMetrics } from "./observability/metrics.js";
export type { ErrorRateSummary, LatencyPercentiles } from "./observability/aggregate.js";
export type {
  Alert as OperationalAlert,
  AlertSeverity,
  AlertThresholds,
} from "./observability/alerts.js";
export { DEFAULT_ALERT_THRESHOLDS, highestSeverity } from "./observability/alerts.js";

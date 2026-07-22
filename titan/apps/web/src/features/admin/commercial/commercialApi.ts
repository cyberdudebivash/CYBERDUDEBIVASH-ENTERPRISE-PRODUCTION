import type {
  LicenseRecord,
  LicenseSearchOptions,
  LicenseSearchResult,
  Plan,
  PlanEntitlements,
  SubscriptionRecord,
  SubscriptionSearchOptions,
  SubscriptionSearchResult,
  SubscriptionStatus,
} from "@titan/platform";
import { getJson, patchJson, postJson } from "../../../lib/apiClient.js";

/**
 * COM-1: `@titan/web`'s side of the Commercial Platform's API surface — one
 * file, shared by both the admin Commercial Workspace/Detail pages
 * (`features/admin/commercial/`) and the Customer Portal's own Subscription
 * page (`features/portal/subscription/`), the same "one API module, two
 * real consumers" shape `RiskBadge`/`FrameworkBadge` already established
 * for components. `@titan/portal/commercial/*` calls resolve their own
 * organization scope server-side (`resolvePortalOrganizationId`,
 * `@titan/platform`) — nothing here ever sends a client-chosen
 * organization id.
 */

export function fetchPlans(): Promise<Plan[]> {
  return getJson<Plan[]>("/api/commercial/plans");
}

/** The Customer Portal's own Commercial Dashboard — one composed response
 * (`GET /api/portal/commercial/subscription`, `router.ts`'s
 * `PortalCommercialSummary`). */
export interface PortalCommercialSummary {
  organizationId: string;
  subscription: {
    id: string;
    planId: string;
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
  } | null;
  plan: Plan | null;
  license: { id: string; seatLimit: number; status: string; expiresAt: string | null } | null;
  seatsUsed: number;
  entitlements: PlanEntitlements | null;
}

export function fetchPortalCommercialSummary(): Promise<PortalCommercialSummary> {
  return getJson<PortalCommercialSummary>("/api/portal/commercial/subscription");
}

export function createPortalSubscription(
  planId: string,
): Promise<{ subscription: SubscriptionRecord; license: LicenseRecord }> {
  return postJson("/api/portal/commercial/subscription", { planId });
}

export function updatePortalSubscription(patch: {
  planId?: string;
  status?: "canceled" | "active";
}): Promise<SubscriptionRecord> {
  return patchJson<SubscriptionRecord>("/api/portal/commercial/subscription", patch);
}

export function searchCommercialSubscriptions(
  options: SubscriptionSearchOptions,
): Promise<SubscriptionSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.planId) params.set("planId", options.planId);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<SubscriptionSearchResult>(
    `/api/commercial/subscriptions/search${query ? `?${query}` : ""}`,
  );
}

export interface CommercialSubscriptionDetail {
  subscription: SubscriptionRecord;
  plan: Plan | null;
  license: LicenseRecord | null;
  seatsUsed: number;
}

export function fetchCommercialSubscription(id: string): Promise<CommercialSubscriptionDetail> {
  return getJson<CommercialSubscriptionDetail>(
    `/api/commercial/subscriptions/${encodeURIComponent(id)}`,
  );
}

export function updateCommercialSubscription(
  id: string,
  patch: { planId?: string; status?: SubscriptionStatus },
): Promise<SubscriptionRecord> {
  return patchJson<SubscriptionRecord>(
    `/api/commercial/subscriptions/${encodeURIComponent(id)}`,
    patch,
  );
}

export function searchCommercialLicenses(
  options: LicenseSearchOptions,
): Promise<LicenseSearchResult> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  const query = params.toString();
  return getJson<LicenseSearchResult>(`/api/commercial/licenses/search${query ? `?${query}` : ""}`);
}

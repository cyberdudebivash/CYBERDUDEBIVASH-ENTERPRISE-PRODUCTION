import type { OperationsSummary } from "@titan/platform";
import { getJson } from "../../../lib/apiClient.js";

/** EAP-7: `@titan/web`'s side of the Enterprise Operations Center's API
 * surface — same one-file-per-feature scope as `auditApi.ts`/`userApi.ts`.
 * `/health`/`/health/ready` are deliberately not wrapped here: they're
 * role-agnostic, unauthenticated endpoints `useDashboardData.ts` already
 * calls directly via `getJson`, and this feature calls them the same way
 * rather than duplicating that one-line wrapper for a second consumer. */
export function fetchOperationsSummary(): Promise<OperationsSummary> {
  return getJson<OperationsSummary>("/api/operations/summary");
}

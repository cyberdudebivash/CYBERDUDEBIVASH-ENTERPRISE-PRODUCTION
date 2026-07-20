import type { UserProfileRecord } from "@titan/platform";
import { getJson } from "../../../lib/apiClient.js";

/** Mirrors router.ts's meResponse (GET /api/me) — not a formally shared
 * type across the Worker/SPA boundary (nothing in this codebase's API
 * contract is), matching how every other endpoint's response shape here is
 * hand-typed on the client side rather than generated. */
export interface MeResponse {
  userId: string;
  email: string | null | undefined;
  profiles: UserProfileRecord[];
  isPlatformAdministrator: boolean;
}

export function fetchMe(): Promise<MeResponse> {
  return getJson<MeResponse>("/api/me");
}

// Re-exported under the name this file's callers already use — the shape itself
// has exactly one definition, in @titan/platform, per Stage 3's "never duplicate
// business logic" rule. `NewLead` (not `LeadRecord`) is correct here: this file
// has no backend assigning a real `id` client-side — the Worker does that
// (titan/packages/platform/src/repositories/leadRepository.d1.ts).
export type { NewLead as LeadRecord } from "@titan/platform";
import type { NewLead as LeadRecord } from "@titan/platform";
import { ApiError, getJson, postJson } from "../../lib/apiClient.js";

export { ApiError };

/**
 * Workstream 4: this used to write to localStorage. It now POSTs to the
 * Worker's `/api/leads` (titan/packages/platform/src/router.ts) — the free
 * scan's lead capture is no longer browser-only persistence. Throws
 * ApiError on failure (network or a non-2xx response); LeadCaptureForm
 * catches that and shows an inline error with the message intact, so the
 * user sees "could not reach the server" instead of a generic failure.
 *
 * Deliberately does NOT capture navigator.userAgent (the original scanner did) —
 * a DPDP-compliance product collecting more of a visitor's data than the lead form
 * itself needs is worth not doing, not an oversight.
 */
export async function submitLead(lead: LeadRecord): Promise<void> {
  await postJson("/api/leads", lead);
}

/** Used by the (future) admin view — not the public scan flow, which never
 * needs to read leads back. Kept here rather than duplicated per DECISION_LOG.md. */
export function fetchLeads(): Promise<LeadRecord[]> {
  return getJson<LeadRecord[]>("/api/leads");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pragmatic format check, not full RFC 5322 validation — real deliverability still
 * needs a confirmation send, which is Workstream 6/8 territory (no email provider
 * decided yet, DECISION_LOG.md). This replaces the original's `includes("@") &&
 * includes(".")`, which accepted strings like "@." — found in Discovery.
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

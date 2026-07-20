// Re-exported under the name this file's callers already use — the shape itself
// has exactly one definition, in @titan/platform, per Stage 3's "never duplicate
// business logic" rule. `NewLead` (not `LeadRecord`) is correct here: this file
// has no backend assigning a real `id` yet (Workstream 7, still not wired up).
export type { NewLead as LeadRecord } from "@titan/platform";
import type { NewLead as LeadRecord } from "@titan/platform";

const STORAGE_KEY = "dpdp_leads";

/**
 * `async` even though this is a synchronous localStorage write today — this is a
 * browser-only interim (Titan's Cloudflare API layer, per DECISION_LOG.md, doesn't
 * exist yet). Keeping the call site awaiting a promise means swapping this for a
 * real API call later doesn't change anything that calls it.
 *
 * Deliberately does NOT capture navigator.userAgent (the original scanner did) —
 * a DPDP-compliance product collecting more of a visitor's data than the lead form
 * itself needs is worth not doing, not an oversight.
 */
export async function submitLead(lead: LeadRecord): Promise<void> {
  const leads = readLeads();
  leads.push(lead);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function readLeads(): LeadRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadRecord[]) : [];
  } catch {
    return [];
  }
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

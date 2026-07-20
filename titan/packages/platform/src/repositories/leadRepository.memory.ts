import type { LeadRecord, LeadRepository, NewLead } from "./types.js";

/**
 * In-process implementation — what titan/apps/web's leadStore.ts approximates
 * today with localStorage, and what this package's own tests run against
 * directly. Also a reasonable default for local `wrangler dev` without a real D1
 * binding, once this Worker is actually run that way (Stage 4).
 */
export function createInMemoryLeadRepository(): LeadRepository {
  const leads: LeadRecord[] = [];

  return {
    async save(lead: NewLead): Promise<LeadRecord> {
      const record: LeadRecord = { id: crypto.randomUUID(), ...lead };
      leads.push(record);
      return record;
    },

    async list(): Promise<LeadRecord[]> {
      return [...leads].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };
}

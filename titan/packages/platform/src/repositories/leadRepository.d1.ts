import type { D1Database } from "@cloudflare/workers-types";
import type { LeadRecord, LeadRepository, NewLead } from "./types.js";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string;
  answers_json: string;
  result_json: string;
  source: string;
  created_at: string;
}

/**
 * D1-backed implementation (db/schema.sql). Never used directly by anything
 * outside this file — everything else depends on the LeadRepository interface
 * (types.ts), per the Repository Pattern decision in DECISION_LOG.md.
 */
export function createD1LeadRepository(db: D1Database): LeadRepository {
  return {
    async save(lead: NewLead): Promise<LeadRecord> {
      const record: LeadRecord = { id: crypto.randomUUID(), ...lead };
      await db
        .prepare(
          `INSERT INTO leads (id, name, email, company, answers_json, result_json, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.name,
          record.email,
          record.company,
          JSON.stringify(record.answers),
          JSON.stringify(record.result),
          record.source,
          record.timestamp,
        )
        .run();
      return record;
    },

    async list(): Promise<LeadRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM leads ORDER BY created_at DESC`)
        .all<LeadRow>();
      return results.map(rowToLeadRecord);
    },
  };
}

function rowToLeadRecord(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    answers: JSON.parse(row.answers_json),
    result: JSON.parse(row.result_json),
    source: row.source,
    timestamp: row.created_at,
  };
}

import type { D1Database } from "@cloudflare/workers-types";
import type { NewOrganization, OrganizationRecord, OrganizationRepository } from "./types.js";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/** D1-backed implementation (migrations/0002_organizations.sql). */
export function createD1OrganizationRepository(db: D1Database): OrganizationRepository {
  return {
    async save(organization: NewOrganization): Promise<OrganizationRecord> {
      const record: OrganizationRecord = { id: crypto.randomUUID(), ...organization };
      await db
        .prepare(`INSERT INTO organizations (id, name, slug, created_at) VALUES (?, ?, ?, ?)`)
        .bind(record.id, record.name, record.slug, record.createdAt)
        .run();
      return record;
    },

    async findBySlug(slug: string): Promise<OrganizationRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM organizations WHERE slug = ?`)
        .bind(slug)
        .first<OrganizationRow>();
      return row ? rowToRecord(row) : null;
    },

    async list(): Promise<OrganizationRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM organizations ORDER BY name ASC`)
        .all<OrganizationRow>();
      return results.map(rowToRecord);
    },
  };
}

function rowToRecord(row: OrganizationRow): OrganizationRecord {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.created_at };
}

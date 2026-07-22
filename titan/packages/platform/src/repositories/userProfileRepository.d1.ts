import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewUserProfile,
  UserProfilePatch,
  UserProfileRecord,
  UserProfileRepository,
  UserRole,
} from "./types.js";

interface UserProfileRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  role: string;
  created_at: string;
}

/** D1-backed implementation (migrations/0003_user_profiles.sql). */
export function createD1UserProfileRepository(db: D1Database): UserProfileRepository {
  return {
    async save(profile: NewUserProfile): Promise<UserProfileRecord> {
      const record: UserProfileRecord = { id: crypto.randomUUID(), ...profile };
      await db
        .prepare(
          `INSERT INTO user_profiles (id, user_id, organization_id, role, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(record.id, record.userId, record.organizationId, record.role, record.createdAt)
        .run();
      return record;
    },

    async findByUserId(userId: string): Promise<UserProfileRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM user_profiles WHERE user_id = ?`)
        .bind(userId)
        .all<UserProfileRow>();
      return results.map(rowToRecord);
    },

    async findByOrganizationId(organizationId: string): Promise<UserProfileRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM user_profiles WHERE organization_id = ?`)
        .bind(organizationId)
        .all<UserProfileRow>();
      return results.map(rowToRecord);
    },

    async findById(id: string): Promise<UserProfileRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM user_profiles WHERE id = ?`)
        .bind(id)
        .first<UserProfileRow>();
      return row ? rowToRecord(row) : null;
    },

    async list(): Promise<UserProfileRecord[]> {
      const { results } = await db.prepare(`SELECT * FROM user_profiles`).all<UserProfileRow>();
      return results.map(rowToRecord);
    },

    async update(id: string, patch: UserProfilePatch): Promise<UserProfileRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM user_profiles WHERE id = ?`)
        .bind(id)
        .first<UserProfileRow>();
      if (!existing) return null;

      await db.prepare(`UPDATE user_profiles SET role = ? WHERE id = ?`).bind(patch.role, id).run();

      return { ...rowToRecord(existing), role: patch.role };
    },

    async remove(id: string): Promise<boolean> {
      const existing = await db
        .prepare(`SELECT id FROM user_profiles WHERE id = ?`)
        .bind(id)
        .first<{ id: string }>();
      if (!existing) return false;
      await db.prepare(`DELETE FROM user_profiles WHERE id = ?`).bind(id).run();
      return true;
    },
  };
}

function rowToRecord(row: UserProfileRow): UserProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    role: row.role as UserRole,
    createdAt: row.created_at,
  };
}

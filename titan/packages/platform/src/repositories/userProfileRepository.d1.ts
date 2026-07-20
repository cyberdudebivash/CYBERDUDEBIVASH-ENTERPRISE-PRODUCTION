import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewUserProfile,
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

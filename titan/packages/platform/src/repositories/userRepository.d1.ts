import type { D1Database } from "@cloudflare/workers-types";
import type { UserRecord, UserRepository, UserSearchOptions, UserSearchResult } from "./types.js";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
}

const SORT_EXPRESSIONS: Record<NonNullable<UserSearchOptions["sortBy"]>, string> = {
  name: "name",
  email: "email",
};

/** D1-backed implementation, reading the real Auth.js `users` table
 * (migrations/0001_authjs_core.sql) — see `UserRecord`'s doc comment
 * (types.ts) for why this repository has no `save`/`update`/`delete` of its
 * own: the `@auth/d1-adapter` is this table's only writer. */
export function createD1UserRepository(db: D1Database): UserRepository {
  return {
    async findById(id: string): Promise<UserRecord | null> {
      const row = await db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>();
      return row ? rowToRecord(row) : null;
    },

    async search(options: UserSearchOptions): Promise<UserSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(`(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)`);
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "name"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM users ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<UserRow>();

      return {
        users: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },
  };
}

function rowToRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
  };
}

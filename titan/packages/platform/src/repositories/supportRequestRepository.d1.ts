import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewSupportRequest,
  SupportRequestPatch,
  SupportRequestRecord,
  SupportRequestRepository,
  SupportRequestSearchOptions,
  SupportRequestSearchResult,
  SupportRequestStatus,
} from "./types.js";

interface SupportRequestRow {
  id: string;
  organization_id: string | null;
  created_by: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

/** D1-backed implementation (migrations/0010_support_requests.sql). */
export function createD1SupportRequestRepository(db: D1Database): SupportRequestRepository {
  return {
    async save(request: NewSupportRequest): Promise<SupportRequestRecord> {
      const record: SupportRequestRecord = {
        id: crypto.randomUUID(),
        status: "open",
        ...request,
      };
      await db
        .prepare(
          `INSERT INTO support_requests (id, organization_id, created_by, subject, message, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.createdBy,
          record.subject,
          record.message,
          record.status,
          record.createdAt,
        )
        .run();
      return record;
    },

    async listByUser(userId: string): Promise<SupportRequestRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM support_requests WHERE created_by = ? ORDER BY created_at DESC`)
        .bind(userId)
        .all<SupportRequestRow>();
      return results.map(rowToRecord);
    },

    async findById(id: string): Promise<SupportRequestRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM support_requests WHERE id = ?`)
        .bind(id)
        .first<SupportRequestRow>();
      return row ? rowToRecord(row) : null;
    },

    async update(id: string, patch: SupportRequestPatch): Promise<SupportRequestRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM support_requests WHERE id = ?`)
        .bind(id)
        .first<SupportRequestRow>();
      if (!existing) return null;
      await db
        .prepare(`UPDATE support_requests SET status = ? WHERE id = ?`)
        .bind(patch.status, id)
        .run();
      return rowToRecord({ ...existing, status: patch.status });
    },

    async search(options: SupportRequestSearchOptions): Promise<SupportRequestSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(`(LOWER(subject) LIKE ? OR LOWER(message) LIKE ?)`);
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }
      if (options.organizationId) {
        conditions.push(`organization_id = ?`);
        params.push(options.organizationId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM support_requests ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM support_requests ${whereClause} ORDER BY created_at ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<SupportRequestRow>();

      return {
        requests: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },
  };
}

function rowToRecord(row: SupportRequestRow): SupportRequestRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    subject: row.subject,
    message: row.message,
    status: row.status as SupportRequestStatus,
    createdAt: row.created_at,
  };
}

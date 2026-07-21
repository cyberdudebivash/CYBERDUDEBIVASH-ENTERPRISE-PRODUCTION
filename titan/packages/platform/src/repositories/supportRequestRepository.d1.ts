import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewSupportRequest,
  SupportRequestRecord,
  SupportRequestRepository,
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

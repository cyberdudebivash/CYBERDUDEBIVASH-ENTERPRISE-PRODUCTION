import type { D1Database } from "@cloudflare/workers-types";
import type { AuditEventRecord, AuditListFilter, AuditRepository, NewAuditEvent } from "./types.js";

interface AuditEventRow {
  id: string;
  actor_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: string | null;
  created_at: string;
}

/** D1-backed implementation (migrations/0007_audit_events.sql). Append-only:
 * there is deliberately no update/delete — audit trails must not be editable. */
export function createD1AuditRepository(db: D1Database): AuditRepository {
  return {
    async record(event: NewAuditEvent): Promise<AuditEventRecord> {
      const record: AuditEventRecord = { id: crypto.randomUUID(), ...event };
      await db
        .prepare(
          `INSERT INTO audit_events (id, actor_id, organization_id, action, entity_type, entity_id, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.actorId,
          record.organizationId,
          record.action,
          record.entityType,
          record.entityId,
          record.metadata ? JSON.stringify(record.metadata) : null,
          record.createdAt,
        )
        .run();
      return record;
    },

    async list(filter?: AuditListFilter): Promise<AuditEventRecord[]> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filter?.entityType) {
        conditions.push("entity_type = ?");
        params.push(filter.entityType);
      }
      if (filter?.entityId) {
        conditions.push("entity_id = ?");
        params.push(filter.entityId);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Uses idx_audit_events_entity (migrations/0007) when both filters are
      // given — the exact (entity_type, entity_id) shape it was created for.
      const { results } = await db
        .prepare(`SELECT * FROM audit_events ${whereClause} ORDER BY created_at DESC`)
        .bind(...params)
        .all<AuditEventRow>();
      return results.map(rowToRecord);
    },
  };
}

function rowToRecord(row: AuditEventRow): AuditEventRecord {
  return {
    id: row.id,
    actorId: row.actor_id,
    organizationId: row.organization_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    createdAt: row.created_at,
  };
}

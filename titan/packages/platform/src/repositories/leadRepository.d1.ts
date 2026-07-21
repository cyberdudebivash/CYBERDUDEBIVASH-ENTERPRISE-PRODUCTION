import type { D1Database } from "@cloudflare/workers-types";
import type {
  LeadLifecyclePatch,
  LeadRecord,
  LeadRepository,
  LeadSearchOptions,
  LeadSearchResult,
  NewLead,
} from "./types.js";

interface LeadRow {
  id: string;
  organization_id: string | null;
  assessment_id: string | null;
  name: string;
  email: string;
  company: string;
  answers_json: string;
  result_json: string;
  source: string;
  created_at: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  tags_json: string;
}

/** Columns a `LeadSearchOptions.sortBy` can map to directly — everything
 * except `riskScore`, which lives inside `result_json` and needs
 * `json_extract` (D1/SQLite's JSON1 extension) instead of a bare column
 * name. Kept as an explicit map rather than a template-string field name so
 * `sortBy` can never reach the query as anything but one of these fixed
 * expressions — no user input is ever concatenated into SQL here. */
const SORT_EXPRESSIONS: Record<NonNullable<LeadSearchOptions["sortBy"]>, string> = {
  createdAt: "created_at",
  name: "name",
  company: "company",
  status: "status",
  priority: "priority",
  riskScore: "json_extract(result_json, '$.score')",
};

/**
 * D1-backed implementation (migrations/0005_leads.sql, 0008_lead_lifecycle.sql).
 * Never used directly by anything outside this file — everything else
 * depends on the LeadRepository interface (types.ts), per the Repository
 * Pattern decision in DECISION_LOG.md.
 */
export function createD1LeadRepository(db: D1Database): LeadRepository {
  return {
    async save(lead: NewLead): Promise<LeadRecord> {
      const record: LeadRecord = {
        id: crypto.randomUUID(),
        organizationId: lead.organizationId ?? null,
        assessmentId: lead.assessmentId ?? null,
        status: lead.status ?? "new",
        priority: lead.priority ?? "medium",
        assignedTo: lead.assignedTo ?? null,
        tags: lead.tags ?? [],
        ...lead,
      };
      await db
        .prepare(
          `INSERT INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at, status, priority, assigned_to, tags_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.assessmentId,
          record.name,
          record.email,
          record.company,
          JSON.stringify(record.answers),
          JSON.stringify(record.result),
          record.source,
          record.timestamp,
          record.status,
          record.priority,
          record.assignedTo,
          JSON.stringify(record.tags),
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

    async findById(id: string): Promise<LeadRecord | null> {
      const row = await db.prepare(`SELECT * FROM leads WHERE id = ?`).bind(id).first<LeadRow>();
      return row ? rowToLeadRecord(row) : null;
    },

    async update(id: string, patch: LeadLifecyclePatch): Promise<LeadRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM leads WHERE id = ?`)
        .bind(id)
        .first<LeadRow>();
      if (!existing) return null;

      const next: LeadRow = {
        ...existing,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.assignedTo !== undefined ? { assigned_to: patch.assignedTo } : {}),
        ...(patch.tags !== undefined ? { tags_json: JSON.stringify(patch.tags) } : {}),
      };

      await db
        .prepare(
          `UPDATE leads SET status = ?, priority = ?, assigned_to = ?, tags_json = ? WHERE id = ?`,
        )
        .bind(next.status, next.priority, next.assigned_to, next.tags_json, id)
        .run();

      return rowToLeadRecord(next);
    },

    async search(options: LeadSearchOptions): Promise<LeadSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(`(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?)`);
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle, needle);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }
      if (options.priority) {
        conditions.push(`priority = ?`);
        params.push(options.priority);
      }
      if (options.assignedTo === "unassigned") {
        conditions.push(`assigned_to IS NULL`);
      } else if (options.assignedTo) {
        conditions.push(`assigned_to = ?`);
        params.push(options.assignedTo);
      }
      if (options.assessmentId) {
        conditions.push(`assessment_id = ?`);
        params.push(options.assessmentId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "createdAt"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM leads ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM leads ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<LeadRow>();

      return {
        leads: results.map(rowToLeadRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },
  };
}

function rowToLeadRecord(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    assessmentId: row.assessment_id,
    name: row.name,
    email: row.email,
    company: row.company,
    answers: JSON.parse(row.answers_json),
    result: JSON.parse(row.result_json),
    source: row.source,
    timestamp: row.created_at,
    status: row.status as LeadRecord["status"],
    priority: row.priority as LeadRecord["priority"],
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags_json),
  };
}

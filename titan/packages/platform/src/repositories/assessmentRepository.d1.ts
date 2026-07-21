import type { D1Database } from "@cloudflare/workers-types";
import type {
  AssessmentRecord,
  AssessmentRepository,
  AssessmentSearchOptions,
  AssessmentSearchResult,
  NewAssessment,
} from "./types.js";

interface AssessmentRow {
  id: string;
  organization_id: string | null;
  created_by: string | null;
  framework: string;
  framework_version: string;
  answers_json: string;
  result_json: string;
  created_at: string;
}

/** Columns an `AssessmentSearchOptions.sortBy` can map to directly — same
 * reasoning as `leadRepository.d1.ts`'s own `SORT_EXPRESSIONS`: a fixed,
 * explicit map so `sortBy` can never reach the query as anything but one of
 * these expressions, never a string-concatenated field name. `riskScore`
 * lives inside `result_json`, hence `json_extract`. */
const SORT_EXPRESSIONS: Record<NonNullable<AssessmentSearchOptions["sortBy"]>, string> = {
  createdAt: "created_at",
  framework: "framework",
  riskScore: "json_extract(result_json, '$.score')",
};

/** D1-backed implementation (migrations/0004_assessments.sql). */
export function createD1AssessmentRepository(db: D1Database): AssessmentRepository {
  return {
    async save(assessment: NewAssessment): Promise<AssessmentRecord> {
      const record: AssessmentRecord = { id: crypto.randomUUID(), ...assessment };
      await db
        .prepare(
          `INSERT INTO assessments (id, organization_id, created_by, framework, framework_version, answers_json, result_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.createdBy,
          record.framework,
          record.frameworkVersion,
          JSON.stringify(record.answers),
          JSON.stringify(record.result),
          record.createdAt,
        )
        .run();
      return record;
    },

    async findById(id: string): Promise<AssessmentRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM assessments WHERE id = ?`)
        .bind(id)
        .first<AssessmentRow>();
      return row ? rowToRecord(row) : null;
    },

    async list(): Promise<AssessmentRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM assessments ORDER BY created_at DESC`)
        .all<AssessmentRow>();
      return results.map(rowToRecord);
    },

    async search(options: AssessmentSearchOptions): Promise<AssessmentSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(
          `(LOWER(id) LIKE ? OR LOWER(organization_id) LIKE ? OR LOWER(created_by) LIKE ?)`,
        );
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle, needle);
      }
      if (options.framework) {
        conditions.push(`framework = ?`);
        params.push(options.framework);
      }
      if (options.riskLevel) {
        conditions.push(`json_extract(result_json, '$.riskLevel') = ?`);
        params.push(options.riskLevel);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "createdAt"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM assessments ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM assessments ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<AssessmentRow>();

      return {
        assessments: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },
  };
}

function rowToRecord(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    framework: row.framework,
    frameworkVersion: row.framework_version,
    answers: JSON.parse(row.answers_json),
    result: JSON.parse(row.result_json),
    createdAt: row.created_at,
  };
}

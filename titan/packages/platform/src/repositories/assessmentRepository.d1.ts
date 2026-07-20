import type { D1Database } from "@cloudflare/workers-types";
import type { AssessmentRecord, AssessmentRepository, NewAssessment } from "./types.js";

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

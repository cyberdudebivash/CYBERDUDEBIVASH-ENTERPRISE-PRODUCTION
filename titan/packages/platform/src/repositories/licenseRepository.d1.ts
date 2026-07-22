import type { D1Database } from "@cloudflare/workers-types";
import type {
  LicensePatch,
  LicenseRecord,
  LicenseRepository,
  LicenseSearchOptions,
  LicenseSearchResult,
  NewLicense,
} from "./types.js";

interface LicenseRow {
  id: string;
  organization_id: string;
  subscription_id: string;
  seat_limit: number;
  status: string;
  activated_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const SORT_EXPRESSIONS: Record<NonNullable<LicenseSearchOptions["sortBy"]>, string> = {
  createdAt: "created_at",
  seatLimit: "seat_limit",
};

/** D1-backed implementation (migrations/0012_licenses.sql). */
export function createD1LicenseRepository(db: D1Database): LicenseRepository {
  return {
    async save(license: NewLicense): Promise<LicenseRecord> {
      const record: LicenseRecord = {
        id: crypto.randomUUID(),
        ...license,
        updatedAt: license.createdAt,
      };
      await db
        .prepare(
          `INSERT INTO licenses
             (id, organization_id, subscription_id, seat_limit, status, activated_at, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.subscriptionId,
          record.seatLimit,
          record.status,
          record.activatedAt,
          record.expiresAt,
          record.createdAt,
          record.updatedAt,
        )
        .run();
      return record;
    },

    async findByOrganizationId(organizationId: string): Promise<LicenseRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM licenses WHERE organization_id = ?`)
        .bind(organizationId)
        .first<LicenseRow>();
      return row ? rowToRecord(row) : null;
    },

    async findById(id: string): Promise<LicenseRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM licenses WHERE id = ?`)
        .bind(id)
        .first<LicenseRow>();
      return row ? rowToRecord(row) : null;
    },

    async search(options: LicenseSearchOptions): Promise<LicenseSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(`(LOWER(organization_id) LIKE ? OR LOWER(subscription_id) LIKE ?)`);
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "createdAt"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM licenses ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM licenses ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<LicenseRow>();

      return {
        licenses: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },

    async update(id: string, patch: LicensePatch): Promise<LicenseRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM licenses WHERE id = ?`)
        .bind(id)
        .first<LicenseRow>();
      if (!existing) return null;

      const current = rowToRecord(existing);
      const updated: LicenseRecord = {
        ...current,
        ...(patch.seatLimit !== undefined ? { seatLimit: patch.seatLimit } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        updatedAt: new Date().toISOString(),
      };

      await db
        .prepare(
          `UPDATE licenses SET seat_limit = ?, status = ?, expires_at = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(updated.seatLimit, updated.status, updated.expiresAt, updated.updatedAt, id)
        .run();

      return updated;
    },
  };
}

function rowToRecord(row: LicenseRow): LicenseRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    subscriptionId: row.subscription_id,
    seatLimit: row.seat_limit,
    status: row.status as LicenseRecord["status"],
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

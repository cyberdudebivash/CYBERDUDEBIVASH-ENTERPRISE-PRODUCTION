import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewOrganization,
  OrganizationPatch,
  OrganizationRecord,
  OrganizationRepository,
  OrganizationSearchOptions,
  OrganizationSearchResult,
} from "./types.js";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  industry: string | null;
  region: string | null;
  tags_json: string;
  created_at: string;
  updated_at: string;
}

/** Columns an `OrganizationSearchOptions.sortBy` can map to — same reasoning
 * as `leadRepository.d1.ts`/`assessmentRepository.d1.ts`'s own
 * `SORT_EXPRESSIONS`: a fixed, explicit map so `sortBy` can never reach the
 * query as anything but one of these column names. */
const SORT_EXPRESSIONS: Record<NonNullable<OrganizationSearchOptions["sortBy"]>, string> = {
  name: "name",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

/** D1-backed implementation (migrations/0002_organizations.sql,
 * migrations/0009_organization_lifecycle.sql). */
export function createD1OrganizationRepository(db: D1Database): OrganizationRepository {
  return {
    async save(organization: NewOrganization): Promise<OrganizationRecord> {
      const record: OrganizationRecord = {
        id: crypto.randomUUID(),
        status: organization.status ?? "active",
        ...organization,
        updatedAt: organization.createdAt,
      };
      await db
        .prepare(
          `INSERT INTO organizations (id, name, slug, status, industry, region, tags_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.name,
          record.slug,
          record.status,
          record.industry,
          record.region,
          JSON.stringify(record.tags),
          record.createdAt,
          record.updatedAt,
        )
        .run();
      return record;
    },

    async findBySlug(slug: string): Promise<OrganizationRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM organizations WHERE slug = ?`)
        .bind(slug)
        .first<OrganizationRow>();
      return row ? rowToRecord(row) : null;
    },

    async findById(id: string): Promise<OrganizationRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM organizations WHERE id = ?`)
        .bind(id)
        .first<OrganizationRow>();
      return row ? rowToRecord(row) : null;
    },

    async list(): Promise<OrganizationRecord[]> {
      const { results } = await db
        .prepare(`SELECT * FROM organizations ORDER BY name ASC`)
        .all<OrganizationRow>();
      return results.map(rowToRecord);
    },

    async search(options: OrganizationSearchOptions): Promise<OrganizationSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(
          `(LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(industry) LIKE ? OR LOWER(region) LIKE ?)`,
        );
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle, needle, needle);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }
      if (options.industry) {
        conditions.push(`industry = ?`);
        params.push(options.industry);
      }
      if (options.region) {
        conditions.push(`region = ?`);
        params.push(options.region);
      }
      if (options.tag) {
        // tags_json is a JSON array of strings — json_each expands it into
        // rows so an exact tag match is a real structural check, not a
        // brittle LIKE '%"tag"%' substring match against raw JSON text.
        conditions.push(
          `EXISTS (SELECT 1 FROM json_each(organizations.tags_json) WHERE json_each.value = ?)`,
        );
        params.push(options.tag);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "name"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM organizations ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM organizations ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<OrganizationRow>();

      return {
        organizations: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },

    async update(id: string, patch: OrganizationPatch): Promise<OrganizationRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM organizations WHERE id = ?`)
        .bind(id)
        .first<OrganizationRow>();
      if (!existing) return null;

      const current = rowToRecord(existing);
      const updated: OrganizationRecord = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
        ...(patch.region !== undefined ? { region: patch.region } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        updatedAt: new Date().toISOString(),
      };

      await db
        .prepare(
          `UPDATE organizations
           SET name = ?, status = ?, industry = ?, region = ?, tags_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          updated.name,
          updated.status,
          updated.industry,
          updated.region,
          JSON.stringify(updated.tags),
          updated.updatedAt,
          id,
        )
        .run();

      return updated;
    },
  };
}

function rowToRecord(row: OrganizationRow): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as OrganizationRecord["status"],
    industry: row.industry,
    region: row.region,
    tags: JSON.parse(row.tags_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

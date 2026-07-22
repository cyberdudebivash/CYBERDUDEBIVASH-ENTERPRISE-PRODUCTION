import type { D1Database } from "@cloudflare/workers-types";
import type {
  NewSubscription,
  SubscriptionPatch,
  SubscriptionRecord,
  SubscriptionRepository,
  SubscriptionSearchOptions,
  SubscriptionSearchResult,
} from "./types.js";

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

const SORT_EXPRESSIONS: Record<NonNullable<SubscriptionSearchOptions["sortBy"]>, string> = {
  createdAt: "created_at",
  currentPeriodEnd: "current_period_end",
};

/** D1-backed implementation (migrations/0011_subscriptions.sql). */
export function createD1SubscriptionRepository(db: D1Database): SubscriptionRepository {
  return {
    async save(subscription: NewSubscription): Promise<SubscriptionRecord> {
      const record: SubscriptionRecord = {
        id: crypto.randomUUID(),
        ...subscription,
        updatedAt: subscription.createdAt,
        canceledAt: null,
      };
      await db
        .prepare(
          `INSERT INTO subscriptions
             (id, organization_id, plan_id, status, trial_ends_at, current_period_end, created_at, updated_at, canceled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.planId,
          record.status,
          record.trialEndsAt,
          record.currentPeriodEnd,
          record.createdAt,
          record.updatedAt,
          record.canceledAt,
        )
        .run();
      return record;
    },

    async findByOrganizationId(organizationId: string): Promise<SubscriptionRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM subscriptions WHERE organization_id = ?`)
        .bind(organizationId)
        .first<SubscriptionRow>();
      return row ? rowToRecord(row) : null;
    },

    async findById(id: string): Promise<SubscriptionRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM subscriptions WHERE id = ?`)
        .bind(id)
        .first<SubscriptionRow>();
      return row ? rowToRecord(row) : null;
    },

    async search(options: SubscriptionSearchOptions): Promise<SubscriptionSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.search) {
        conditions.push(`(LOWER(organization_id) LIKE ? OR LOWER(plan_id) LIKE ?)`);
        const needle = `%${options.search.toLowerCase()}%`;
        params.push(needle, needle);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }
      if (options.planId) {
        conditions.push(`plan_id = ?`);
        params.push(options.planId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const sortExpression = SORT_EXPRESSIONS[options.sortBy ?? "createdAt"];
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM subscriptions ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM subscriptions ${whereClause} ORDER BY ${sortExpression} ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<SubscriptionRow>();

      return {
        subscriptions: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },

    async update(id: string, patch: SubscriptionPatch): Promise<SubscriptionRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM subscriptions WHERE id = ?`)
        .bind(id)
        .first<SubscriptionRow>();
      if (!existing) return null;

      const current = rowToRecord(existing);
      const updated: SubscriptionRecord = {
        ...current,
        ...(patch.planId !== undefined ? { planId: patch.planId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.trialEndsAt !== undefined ? { trialEndsAt: patch.trialEndsAt } : {}),
        ...(patch.currentPeriodEnd !== undefined
          ? { currentPeriodEnd: patch.currentPeriodEnd }
          : {}),
        ...(patch.canceledAt !== undefined ? { canceledAt: patch.canceledAt } : {}),
        updatedAt: new Date().toISOString(),
      };

      await db
        .prepare(
          `UPDATE subscriptions
           SET plan_id = ?, status = ?, trial_ends_at = ?, current_period_end = ?, updated_at = ?, canceled_at = ?
           WHERE id = ?`,
        )
        .bind(
          updated.planId,
          updated.status,
          updated.trialEndsAt,
          updated.currentPeriodEnd,
          updated.updatedAt,
          updated.canceledAt,
          id,
        )
        .run();

      return updated;
    },
  };
}

function rowToRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status as SubscriptionRecord["status"],
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canceledAt: row.canceled_at,
  };
}

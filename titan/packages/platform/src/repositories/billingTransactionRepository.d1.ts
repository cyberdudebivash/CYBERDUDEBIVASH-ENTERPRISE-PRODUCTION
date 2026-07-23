import type { D1Database } from "@cloudflare/workers-types";
import type {
  BillingTransactionPatch,
  BillingTransactionRecord,
  BillingTransactionRepository,
  BillingTransactionSearchOptions,
  BillingTransactionSearchResult,
  NewBillingTransaction,
} from "./types.js";

interface BillingTransactionRow {
  id: string;
  organization_id: string;
  subscription_id: string;
  plan_id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  provider_signature: string | null;
  amount_paise: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** D1-backed implementation (migrations/0013_billing_transactions.sql). */
export function createD1BillingTransactionRepository(db: D1Database): BillingTransactionRepository {
  return {
    async save(transaction: NewBillingTransaction): Promise<BillingTransactionRecord> {
      const record: BillingTransactionRecord = {
        id: crypto.randomUUID(),
        ...transaction,
        updatedAt: transaction.createdAt,
      };
      await db
        .prepare(
          `INSERT INTO billing_transactions
             (id, organization_id, subscription_id, plan_id, provider, provider_order_id,
              provider_payment_id, provider_signature, amount_paise, currency, status,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.organizationId,
          record.subscriptionId,
          record.planId,
          record.provider,
          record.providerOrderId,
          record.providerPaymentId,
          record.providerSignature,
          record.amountPaise,
          record.currency,
          record.status,
          record.createdAt,
          record.updatedAt,
        )
        .run();
      return record;
    },

    async findById(id: string): Promise<BillingTransactionRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM billing_transactions WHERE id = ?`)
        .bind(id)
        .first<BillingTransactionRow>();
      return row ? rowToRecord(row) : null;
    },

    async findByProviderOrderId(providerOrderId: string): Promise<BillingTransactionRecord | null> {
      const row = await db
        .prepare(`SELECT * FROM billing_transactions WHERE provider_order_id = ?`)
        .bind(providerOrderId)
        .first<BillingTransactionRow>();
      return row ? rowToRecord(row) : null;
    },

    async search(
      options: BillingTransactionSearchOptions,
    ): Promise<BillingTransactionSearchResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.organizationId) {
        conditions.push(`organization_id = ?`);
        params.push(options.organizationId);
      }
      if (options.status) {
        conditions.push(`status = ?`);
        params.push(options.status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const countRow = await db
        .prepare(`SELECT COUNT(*) as count FROM billing_transactions ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>();

      const { results } = await db
        .prepare(
          `SELECT * FROM billing_transactions ${whereClause} ORDER BY created_at ${direction} LIMIT ? OFFSET ?`,
        )
        .bind(...params, pageSize, offset)
        .all<BillingTransactionRow>();

      return {
        transactions: results.map(rowToRecord),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      };
    },

    async update(
      id: string,
      patch: BillingTransactionPatch,
    ): Promise<BillingTransactionRecord | null> {
      const existing = await db
        .prepare(`SELECT * FROM billing_transactions WHERE id = ?`)
        .bind(id)
        .first<BillingTransactionRow>();
      if (!existing) return null;

      const current = rowToRecord(existing);
      const updated: BillingTransactionRecord = {
        ...current,
        ...(patch.providerPaymentId !== undefined
          ? { providerPaymentId: patch.providerPaymentId }
          : {}),
        ...(patch.providerSignature !== undefined
          ? { providerSignature: patch.providerSignature }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updatedAt: new Date().toISOString(),
      };

      await db
        .prepare(
          `UPDATE billing_transactions
           SET provider_payment_id = ?, provider_signature = ?, status = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          updated.providerPaymentId,
          updated.providerSignature,
          updated.status,
          updated.updatedAt,
          id,
        )
        .run();

      return updated;
    },
  };
}

function rowToRecord(row: BillingTransactionRow): BillingTransactionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    subscriptionId: row.subscription_id,
    planId: row.plan_id,
    provider: row.provider as BillingTransactionRecord["provider"],
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    providerSignature: row.provider_signature,
    amountPaise: row.amount_paise,
    currency: row.currency,
    status: row.status as BillingTransactionRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

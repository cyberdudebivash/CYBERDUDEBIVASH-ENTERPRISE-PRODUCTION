import type {
  BillingTransactionPatch,
  BillingTransactionRecord,
  BillingTransactionRepository,
  BillingTransactionSearchOptions,
  BillingTransactionSearchResult,
  NewBillingTransaction,
} from "./types.js";

export function createInMemoryBillingTransactionRepository(): BillingTransactionRepository {
  const transactions: BillingTransactionRecord[] = [];

  return {
    async save(transaction: NewBillingTransaction): Promise<BillingTransactionRecord> {
      const record: BillingTransactionRecord = {
        id: crypto.randomUUID(),
        ...transaction,
        updatedAt: transaction.createdAt,
      };
      transactions.push(record);
      return record;
    },

    async findById(id: string): Promise<BillingTransactionRecord | null> {
      return transactions.find((t) => t.id === id) ?? null;
    },

    async findByProviderOrderId(providerOrderId: string): Promise<BillingTransactionRecord | null> {
      return transactions.find((t) => t.providerOrderId === providerOrderId) ?? null;
    },

    async search(
      options: BillingTransactionSearchOptions,
    ): Promise<BillingTransactionSearchResult> {
      let filtered = [...transactions];

      if (options.organizationId) {
        filtered = filtered.filter((t) => t.organizationId === options.organizationId);
      }
      if (options.status) {
        filtered = filtered.filter((t) => t.status === options.status);
      }

      filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;

      return {
        transactions: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },

    async update(
      id: string,
      patch: BillingTransactionPatch,
    ): Promise<BillingTransactionRecord | null> {
      const index = transactions.findIndex((t) => t.id === id);
      if (index === -1) return null;
      const updated: BillingTransactionRecord = {
        ...transactions[index]!,
        ...(patch.providerPaymentId !== undefined
          ? { providerPaymentId: patch.providerPaymentId }
          : {}),
        ...(patch.providerSignature !== undefined
          ? { providerSignature: patch.providerSignature }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updatedAt: new Date().toISOString(),
      };
      transactions[index] = updated;
      return updated;
    },
  };
}

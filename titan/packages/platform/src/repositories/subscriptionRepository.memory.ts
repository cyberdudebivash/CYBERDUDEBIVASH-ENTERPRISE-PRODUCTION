import type {
  NewSubscription,
  SubscriptionPatch,
  SubscriptionRecord,
  SubscriptionRepository,
  SubscriptionSearchOptions,
  SubscriptionSearchResult,
} from "./types.js";

export function createInMemorySubscriptionRepository(): SubscriptionRepository {
  const subscriptions: SubscriptionRecord[] = [];

  return {
    async save(subscription: NewSubscription): Promise<SubscriptionRecord> {
      const record: SubscriptionRecord = {
        id: crypto.randomUUID(),
        ...subscription,
        updatedAt: subscription.createdAt,
        canceledAt: null,
        providerSubscriptionId: null,
      };
      subscriptions.push(record);
      return record;
    },

    async findByOrganizationId(organizationId: string): Promise<SubscriptionRecord | null> {
      return subscriptions.find((s) => s.organizationId === organizationId) ?? null;
    },

    async findById(id: string): Promise<SubscriptionRecord | null> {
      return subscriptions.find((s) => s.id === id) ?? null;
    },

    async findByProviderSubscriptionId(
      providerSubscriptionId: string,
    ): Promise<SubscriptionRecord | null> {
      return subscriptions.find((s) => s.providerSubscriptionId === providerSubscriptionId) ?? null;
    },

    async search(options: SubscriptionSearchOptions): Promise<SubscriptionSearchResult> {
      let filtered = [...subscriptions];

      if (options.search) {
        const needle = options.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.organizationId.toLowerCase().includes(needle) ||
            s.planId.toLowerCase().includes(needle),
        );
      }
      if (options.status) {
        filtered = filtered.filter((s) => s.status === options.status);
      }
      if (options.planId) {
        filtered = filtered.filter((s) => s.planId === options.planId);
      }

      const sortBy = options.sortBy ?? "createdAt";
      const direction = options.sortDirection === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const left = sortBy === "currentPeriodEnd" ? (a.currentPeriodEnd ?? "") : a.createdAt;
        const right = sortBy === "currentPeriodEnd" ? (b.currentPeriodEnd ?? "") : b.createdAt;
        return left < right ? -1 * direction : left > right ? 1 * direction : 0;
      });

      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;

      return {
        subscriptions: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },

    async update(id: string, patch: SubscriptionPatch): Promise<SubscriptionRecord | null> {
      const index = subscriptions.findIndex((s) => s.id === id);
      if (index === -1) return null;
      const updated: SubscriptionRecord = {
        ...subscriptions[index]!,
        ...(patch.planId !== undefined ? { planId: patch.planId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.trialEndsAt !== undefined ? { trialEndsAt: patch.trialEndsAt } : {}),
        ...(patch.currentPeriodEnd !== undefined
          ? { currentPeriodEnd: patch.currentPeriodEnd }
          : {}),
        ...(patch.canceledAt !== undefined ? { canceledAt: patch.canceledAt } : {}),
        ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
        ...(patch.providerSubscriptionId !== undefined
          ? { providerSubscriptionId: patch.providerSubscriptionId }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      subscriptions[index] = updated;
      return updated;
    },
  };
}

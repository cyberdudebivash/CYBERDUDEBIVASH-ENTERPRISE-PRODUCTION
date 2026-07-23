import { describe, expect, it } from "vitest";
import type { BillingTransactionRepository, NewBillingTransaction } from "./types.js";

const sampleTransaction: NewBillingTransaction = {
  organizationId: "org_1",
  subscriptionId: "sub_1",
  planId: "starter",
  provider: "razorpay",
  providerOrderId: "order_1",
  providerPaymentId: null,
  providerSignature: null,
  amountPaise: 999900,
  currency: "INR",
  status: "created",
  createdAt: "2026-07-23T00:00:00.000Z",
};

/** Proves the in-memory and D1-backed BillingTransactionRepository
 * implementations are interchangeable, the same pattern every repository
 * contract in this package already establishes. */
export function describeBillingTransactionRepositoryContract(
  name: string,
  createRepository: () => BillingTransactionRepository,
) {
  describe(`BillingTransactionRepository contract — ${name}`, () => {
    it("returns null before anything is saved for a provider order id", async () => {
      const repo = createRepository();
      expect(await repo.findByProviderOrderId("order_1")).toBeNull();
    });

    it("assigns an id and sets updatedAt to createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleTransaction);
      expect(saved.id).toBeTruthy();
      expect(saved.updatedAt).toBe(sampleTransaction.createdAt);
      expect(saved).toMatchObject(sampleTransaction);
    });

    it("finds a transaction by its provider order id", async () => {
      const repo = createRepository();
      await repo.save(sampleTransaction);
      expect(await repo.findByProviderOrderId("order_1")).toMatchObject(sampleTransaction);
    });

    it("does not return another transaction's provider order id", async () => {
      const repo = createRepository();
      await repo.save(sampleTransaction);
      await repo.save({ ...sampleTransaction, providerOrderId: "order_2" });
      const found = await repo.findByProviderOrderId("order_2");
      expect(found?.providerOrderId).toBe("order_2");
    });

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleTransaction);
      expect(await repo.findById(saved.id)).toMatchObject(sampleTransaction);
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { status: "paid" })).toBeNull();
    });

    it("update applies only the patched fields, leaving the rest untouched", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleTransaction);
      const updated = await repo.update(saved.id, {
        status: "paid",
        providerPaymentId: "pay_1",
        providerSignature: "sig_1",
      });
      expect(updated?.status).toBe("paid");
      expect(updated?.providerPaymentId).toBe("pay_1");
      expect(updated?.providerSignature).toBe("sig_1");
      expect(updated?.amountPaise).toBe(999900);
      expect(updated?.planId).toBe("starter");
    });

    it("update persists across a fresh read, not just the return value", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleTransaction);
      await repo.update(saved.id, { status: "failed" });
      const reread = await repo.findById(saved.id);
      expect(reread?.status).toBe("failed");
    });

    it("update refreshes updatedAt away from createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleTransaction);
      const updated = await repo.update(saved.id, { status: "paid" });
      expect(updated?.updatedAt).not.toBe(saved.createdAt);
    });

    it("search with no options returns everything, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save(sampleTransaction);
      await repo.save({ ...sampleTransaction, providerOrderId: "order_2" });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.transactions).toHaveLength(2);
    });

    it("search filters by organizationId", async () => {
      const repo = createRepository();
      await repo.save(sampleTransaction);
      await repo.save({
        ...sampleTransaction,
        organizationId: "org_2",
        providerOrderId: "order_2",
      });
      const result = await repo.search({ organizationId: "org_2" });
      expect(result.total).toBe(1);
      expect(result.transactions[0]?.organizationId).toBe("org_2");
    });

    it("search filters by status — the real gate a scanner-access check relies on", async () => {
      const repo = createRepository();
      const a = await repo.save(sampleTransaction);
      await repo.save({ ...sampleTransaction, providerOrderId: "order_2" });
      await repo.update(a.id, { status: "paid" });
      const result = await repo.search({ organizationId: "org_1", status: "paid" });
      expect(result.total).toBe(1);
      expect(result.transactions[0]?.id).toBe(a.id);
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleTransaction, providerOrderId: `order_${i}` });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1 });
      const secondPage = await repo.search({ pageSize: 2, page: 2 });
      expect(firstPage.total).toBe(5);
      expect(firstPage.transactions).toHaveLength(2);
      expect(secondPage.transactions).toHaveLength(2);
      expect(firstPage.transactions[0]?.providerOrderId).not.toBe(
        secondPage.transactions[0]?.providerOrderId,
      );
    });
  });
}

import { describe, expect, it } from "vitest";
import type { NewSubscription, SubscriptionRepository } from "./types.js";

const sampleSubscription: NewSubscription = {
  organizationId: "org_1",
  planId: "professional",
  status: "trialing",
  trialEndsAt: "2026-08-03T00:00:00.000Z",
  currentPeriodEnd: "2026-08-20T00:00:00.000Z",
  createdAt: "2026-07-20T00:00:00.000Z",
};

/** Proves the in-memory and D1-backed SubscriptionRepository implementations
 * are interchangeable, the same pattern every repository contract in this
 * package already establishes. */
export function describeSubscriptionRepositoryContract(
  name: string,
  createRepository: () => SubscriptionRepository,
) {
  describe(`SubscriptionRepository contract — ${name}`, () => {
    it("returns null before anything is saved for an organization", async () => {
      const repo = createRepository();
      expect(await repo.findByOrganizationId("org_1")).toBeNull();
    });

    it("assigns an id, defaults canceledAt to null, and sets updatedAt to createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      expect(saved.id).toBeTruthy();
      expect(saved.canceledAt).toBeNull();
      expect(saved.updatedAt).toBe(sampleSubscription.createdAt);
      expect(saved).toMatchObject(sampleSubscription);
    });

    it("finds a subscription by its organization id", async () => {
      const repo = createRepository();
      await repo.save(sampleSubscription);
      const found = await repo.findByOrganizationId("org_1");
      expect(found).toMatchObject(sampleSubscription);
    });

    it("does not return another organization's subscription", async () => {
      const repo = createRepository();
      await repo.save(sampleSubscription);
      await repo.save({ ...sampleSubscription, organizationId: "org_2" });
      const found = await repo.findByOrganizationId("org_2");
      expect(found?.organizationId).toBe("org_2");
    });

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      expect(await repo.findById(saved.id)).toMatchObject(sampleSubscription);
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { status: "active" })).toBeNull();
    });

    it("update applies only the patched fields, leaving the rest untouched", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      const updated = await repo.update(saved.id, { status: "active" });
      expect(updated?.status).toBe("active");
      expect(updated?.planId).toBe(sampleSubscription.planId);
    });

    it("update persists across a fresh read, not just the return value", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      await repo.update(saved.id, { planId: "enterprise" });
      const reread = await repo.findById(saved.id);
      expect(reread?.planId).toBe("enterprise");
    });

    it("update can record cancellation via status and canceledAt together", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      const canceled = await repo.update(saved.id, {
        status: "canceled",
        canceledAt: "2026-07-25T00:00:00.000Z",
      });
      expect(canceled?.status).toBe("canceled");
      expect(canceled?.canceledAt).toBe("2026-07-25T00:00:00.000Z");
    });

    it("update refreshes updatedAt away from createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleSubscription);
      const updated = await repo.update(saved.id, { status: "active" });
      expect(updated?.updatedAt).not.toBe(saved.createdAt);
    });

    it("search with no options returns everything, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save(sampleSubscription);
      await repo.save({ ...sampleSubscription, organizationId: "org_2" });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.subscriptions).toHaveLength(2);
      expect(result.page).toBe(1);
    });

    it("search filters by a case-insensitive substring across organizationId/planId", async () => {
      const repo = createRepository();
      await repo.save(sampleSubscription);
      await repo.save({ ...sampleSubscription, organizationId: "org_2", planId: "starter" });
      const result = await repo.search({ search: "professional" });
      expect(result.total).toBe(1);
      expect(result.subscriptions[0]?.planId).toBe("professional");
    });

    it("search filters by status", async () => {
      const repo = createRepository();
      const a = await repo.save(sampleSubscription);
      await repo.save({ ...sampleSubscription, organizationId: "org_2" });
      await repo.update(a.id, { status: "active" });
      const result = await repo.search({ status: "active" });
      expect(result.total).toBe(1);
      expect(result.subscriptions[0]?.id).toBe(a.id);
    });

    it("search filters by planId", async () => {
      const repo = createRepository();
      await repo.save(sampleSubscription);
      await repo.save({ ...sampleSubscription, organizationId: "org_2", planId: "starter" });
      const result = await repo.search({ planId: "starter" });
      expect(result.total).toBe(1);
      expect(result.subscriptions[0]?.organizationId).toBe("org_2");
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleSubscription, organizationId: `org_${i}` });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1 });
      const secondPage = await repo.search({ pageSize: 2, page: 2 });
      expect(firstPage.total).toBe(5);
      expect(firstPage.subscriptions).toHaveLength(2);
      expect(secondPage.subscriptions).toHaveLength(2);
      expect(firstPage.subscriptions[0]?.organizationId).not.toBe(
        secondPage.subscriptions[0]?.organizationId,
      );
    });
  });
}

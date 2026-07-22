import { describe, expect, it } from "vitest";
import type { LicenseRepository, NewLicense } from "./types.js";

const sampleLicense: NewLicense = {
  organizationId: "org_1",
  subscriptionId: "sub_1",
  seatLimit: 50,
  status: "active",
  activatedAt: "2026-07-20T00:00:00.000Z",
  expiresAt: null,
  createdAt: "2026-07-20T00:00:00.000Z",
};

/** Proves the in-memory and D1-backed LicenseRepository implementations are
 * interchangeable, the same pattern every repository contract in this
 * package already establishes. */
export function describeLicenseRepositoryContract(
  name: string,
  createRepository: () => LicenseRepository,
) {
  describe(`LicenseRepository contract — ${name}`, () => {
    it("returns null before anything is saved for an organization", async () => {
      const repo = createRepository();
      expect(await repo.findByOrganizationId("org_1")).toBeNull();
    });

    it("assigns an id and sets updatedAt to createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLicense);
      expect(saved.id).toBeTruthy();
      expect(saved.updatedAt).toBe(sampleLicense.createdAt);
      expect(saved).toMatchObject(sampleLicense);
    });

    it("finds a license by its organization id", async () => {
      const repo = createRepository();
      await repo.save(sampleLicense);
      expect(await repo.findByOrganizationId("org_1")).toMatchObject(sampleLicense);
    });

    it("does not return another organization's license", async () => {
      const repo = createRepository();
      await repo.save(sampleLicense);
      await repo.save({ ...sampleLicense, organizationId: "org_2", subscriptionId: "sub_2" });
      const found = await repo.findByOrganizationId("org_2");
      expect(found?.organizationId).toBe("org_2");
    });

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLicense);
      expect(await repo.findById(saved.id)).toMatchObject(sampleLicense);
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { seatLimit: 10 })).toBeNull();
    });

    it("update applies only the patched fields, leaving the rest untouched", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLicense);
      const updated = await repo.update(saved.id, { seatLimit: 100 });
      expect(updated?.seatLimit).toBe(100);
      expect(updated?.status).toBe("active");
    });

    it("update persists across a fresh read, not just the return value", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLicense);
      await repo.update(saved.id, { status: "expired" });
      const reread = await repo.findById(saved.id);
      expect(reread?.status).toBe("expired");
    });

    it("update refreshes updatedAt away from createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLicense);
      const updated = await repo.update(saved.id, { seatLimit: 75 });
      expect(updated?.updatedAt).not.toBe(saved.createdAt);
    });

    it("search with no options returns everything, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save(sampleLicense);
      await repo.save({ ...sampleLicense, organizationId: "org_2", subscriptionId: "sub_2" });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.licenses).toHaveLength(2);
    });

    it("search filters by a case-insensitive substring across organizationId/subscriptionId", async () => {
      const repo = createRepository();
      await repo.save(sampleLicense);
      await repo.save({ ...sampleLicense, organizationId: "org_2", subscriptionId: "sub_9" });
      const result = await repo.search({ search: "sub_9" });
      expect(result.total).toBe(1);
      expect(result.licenses[0]?.organizationId).toBe("org_2");
    });

    it("search filters by status", async () => {
      const repo = createRepository();
      const a = await repo.save(sampleLicense);
      await repo.save({ ...sampleLicense, organizationId: "org_2", subscriptionId: "sub_2" });
      await repo.update(a.id, { status: "expired" });
      const result = await repo.search({ status: "expired" });
      expect(result.total).toBe(1);
      expect(result.licenses[0]?.id).toBe(a.id);
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({
          ...sampleLicense,
          organizationId: `org_${i}`,
          subscriptionId: `sub_${i}`,
        });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1 });
      const secondPage = await repo.search({ pageSize: 2, page: 2 });
      expect(firstPage.total).toBe(5);
      expect(firstPage.licenses).toHaveLength(2);
      expect(secondPage.licenses).toHaveLength(2);
      expect(firstPage.licenses[0]?.organizationId).not.toBe(
        secondPage.licenses[0]?.organizationId,
      );
    });
  });
}

import { describe, expect, it } from "vitest";
import type { NewOrganization, OrganizationRepository } from "./types.js";

const sampleOrg: NewOrganization = {
  name: "Acme Fintech",
  slug: "acme-fintech",
  createdAt: "2026-07-20T00:00:00.000Z",
};

/** Proves the in-memory and D1-backed OrganizationRepository implementations
 * are interchangeable, the same pattern leadRepository.contract.ts established. */
export function describeOrganizationRepositoryContract(
  name: string,
  createRepository: () => OrganizationRepository,
) {
  describe(`OrganizationRepository contract — ${name}`, () => {
    it("returns an empty list before anything is saved", async () => {
      const repo = createRepository();
      expect(await repo.list()).toEqual([]);
    });

    it("assigns an id and returns the saved record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      expect(saved.id).toBeTruthy();
      expect(saved).toMatchObject(sampleOrg);
    });

    it("finds an organization by slug", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      const found = await repo.findBySlug("acme-fintech");
      expect(found).toMatchObject(sampleOrg);
    });

    it("returns null when no organization matches the slug", async () => {
      const repo = createRepository();
      expect(await repo.findBySlug("does-not-exist")).toBeNull();
    });

    it("accumulates multiple organizations", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      await repo.save({ ...sampleOrg, name: "Beta Health", slug: "beta-health" });
      expect(await repo.list()).toHaveLength(2);
    });
  });
}

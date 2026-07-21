import { describe, expect, it } from "vitest";
import type { NewOrganization, OrganizationRepository } from "./types.js";

const sampleOrg: NewOrganization = {
  name: "Acme Fintech",
  slug: "acme-fintech",
  industry: "Financial Services",
  region: "APAC",
  tags: ["enterprise"],
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

    // EAP-4 lifecycle/metadata fields.
    it("defaults status to active and industry/region to null when omitted", async () => {
      const repo = createRepository();
      const saved = await repo.save({
        name: "Minimal Org",
        slug: "minimal-org",
        industry: null,
        region: null,
        tags: [],
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      expect(saved.status).toBe("active");
      expect(saved.industry).toBeNull();
      expect(saved.region).toBeNull();
      expect(saved.tags).toEqual([]);
    });

    it("sets updatedAt to createdAt on save", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      expect(saved.updatedAt).toBe(sampleOrg.createdAt);
    });

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      const found = await repo.findById(saved.id);
      expect(found).toMatchObject(sampleOrg);
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { name: "New Name" })).toBeNull();
    });

    it("update applies only the patched fields, leaving the rest untouched", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      const updated = await repo.update(saved.id, { industry: "Healthcare" });
      expect(updated?.industry).toBe("Healthcare");
      expect(updated?.name).toBe(sampleOrg.name);
      expect(updated?.region).toBe(sampleOrg.region);
    });

    it("update persists across a fresh read (findById/list), not just the return value", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      await repo.update(saved.id, { name: "Acme Financial", tags: ["enterprise", "renewed"] });
      const reread = await repo.findById(saved.id);
      expect(reread?.name).toBe("Acme Financial");
      expect(reread?.tags).toEqual(["enterprise", "renewed"]);
    });

    it("update can archive and restore via status", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      const archived = await repo.update(saved.id, { status: "archived" });
      expect(archived?.status).toBe("archived");
      const restored = await repo.update(saved.id, { status: "active" });
      expect(restored?.status).toBe("active");
    });

    it("update can clear industry/region back to null", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      const updated = await repo.update(saved.id, { industry: null, region: null });
      expect(updated?.industry).toBeNull();
      expect(updated?.region).toBeNull();
    });

    it("update refreshes updatedAt away from createdAt", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleOrg);
      const updated = await repo.update(saved.id, { name: "Acme Financial" });
      expect(updated?.updatedAt).not.toBe(saved.createdAt);
    });

    // No sortDirection defaults to descending, same convention as
    // LeadRepository/AssessmentRepository search (a uniform "no direction
    // means descending" contract, regardless of which field sorts) — so the
    // default sortBy ("name") descending puts "Zenith" ahead of "Acme".
    it("search with no options returns everything, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleOrg, name: "Zenith Corp", slug: "zenith-corp" });
      await repo.save({ ...sampleOrg, name: "Acme Fintech", slug: "acme-fintech-2" });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0]?.name).toBe("Zenith Corp");
      expect(result.page).toBe(1);
    });

    it("search filters by a case-insensitive substring across name/slug/industry/region", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      await repo.save({
        ...sampleOrg,
        name: "Globex Retail",
        slug: "globex-retail",
        industry: "Retail",
        region: "EMEA",
      });
      const result = await repo.search({ search: "fintech" });
      expect(result.total).toBe(1);
      expect(result.organizations[0]?.name).toBe("Acme Fintech");
    });

    it("search filters by status", async () => {
      const repo = createRepository();
      const a = await repo.save(sampleOrg);
      await repo.save({ ...sampleOrg, name: "Beta Health", slug: "beta-health" });
      await repo.update(a.id, { status: "archived" });
      const result = await repo.search({ status: "archived" });
      expect(result.total).toBe(1);
      expect(result.organizations[0]?.id).toBe(a.id);
    });

    it("search filters by industry", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      await repo.save({
        ...sampleOrg,
        name: "Globex Retail",
        slug: "globex-retail",
        industry: "Retail",
      });
      const result = await repo.search({ industry: "Retail" });
      expect(result.total).toBe(1);
      expect(result.organizations[0]?.industry).toBe("Retail");
    });

    it("search filters by region", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      await repo.save({
        ...sampleOrg,
        name: "Globex Retail",
        slug: "globex-retail",
        region: "EMEA",
      });
      const result = await repo.search({ region: "EMEA" });
      expect(result.total).toBe(1);
      expect(result.organizations[0]?.region).toBe("EMEA");
    });

    it("search filters by an exact tag", async () => {
      const repo = createRepository();
      await repo.save(sampleOrg);
      await repo.save({
        ...sampleOrg,
        name: "Globex Retail",
        slug: "globex-retail",
        tags: ["smb"],
      });
      const result = await repo.search({ tag: "smb" });
      expect(result.total).toBe(1);
      expect(result.organizations[0]?.name).toBe("Globex Retail");
    });

    it("search sorts by createdAt", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleOrg, createdAt: "2026-07-19T00:00:00.000Z" });
      await repo.save({
        ...sampleOrg,
        name: "Beta Health",
        slug: "beta-health",
        createdAt: "2026-07-20T00:00:00.000Z",
      });
      const result = await repo.search({ sortBy: "createdAt", sortDirection: "desc" });
      expect(result.organizations[0]?.name).toBe("Beta Health");
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleOrg, name: `Org ${i}`, slug: `org-${i}` });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1 });
      const secondPage = await repo.search({ pageSize: 2, page: 2 });
      expect(firstPage.total).toBe(5);
      expect(firstPage.organizations).toHaveLength(2);
      expect(secondPage.organizations).toHaveLength(2);
      expect(firstPage.organizations[0]?.slug).not.toBe(secondPage.organizations[0]?.slug);
    });
  });
}

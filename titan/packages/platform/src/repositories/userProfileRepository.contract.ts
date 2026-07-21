import { describe, expect, it } from "vitest";
import type { NewUserProfile, UserProfileRepository } from "./types.js";

const sampleProfile: NewUserProfile = {
  userId: "user_1",
  organizationId: "org_1",
  role: "owner",
  createdAt: "2026-07-20T00:00:00.000Z",
};

export function describeUserProfileRepositoryContract(
  name: string,
  createRepository: () => UserProfileRepository,
) {
  describe(`UserProfileRepository contract — ${name}`, () => {
    it("returns an empty list before anything is saved for a user", async () => {
      const repo = createRepository();
      expect(await repo.findByUserId("user_1")).toEqual([]);
    });

    it("assigns an id and returns the saved record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleProfile);
      expect(saved.id).toBeTruthy();
      expect(saved).toMatchObject(sampleProfile);
    });

    it("finds profiles by user id", async () => {
      const repo = createRepository();
      await repo.save(sampleProfile);
      const found = await repo.findByUserId("user_1");
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject(sampleProfile);
    });

    it("supports membership in more than one organization per user", async () => {
      const repo = createRepository();
      await repo.save(sampleProfile);
      await repo.save({ ...sampleProfile, organizationId: "org_2", role: "member" });
      const found = await repo.findByUserId("user_1");
      expect(found).toHaveLength(2);
    });

    it("does not return another user's profiles", async () => {
      const repo = createRepository();
      await repo.save(sampleProfile);
      await repo.save({ ...sampleProfile, userId: "user_2" });
      expect(await repo.findByUserId("user_2")).toHaveLength(1);
    });

    // EAP-5:

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("findById finds a saved profile by its own id", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleProfile);
      expect(await repo.findById(saved.id)).toMatchObject(sampleProfile);
    });

    it("list returns every profile, across every user", async () => {
      const repo = createRepository();
      await repo.save(sampleProfile);
      await repo.save({ ...sampleProfile, userId: "user_2", organizationId: "org_2" });
      expect(await repo.list()).toHaveLength(2);
    });

    it("update changes the role and returns the updated record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleProfile);
      const updated = await repo.update(saved.id, { role: "admin" });
      expect(updated).toMatchObject({ id: saved.id, role: "admin" });
      expect(await repo.findById(saved.id)).toMatchObject({ role: "admin" });
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { role: "admin" })).toBeNull();
    });

    it("remove deletes the profile and returns true", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleProfile);
      expect(await repo.remove(saved.id)).toBe(true);
      expect(await repo.findById(saved.id)).toBeNull();
      expect(await repo.findByUserId(sampleProfile.userId)).toEqual([]);
    });

    it("remove returns false for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.remove("does-not-exist")).toBe(false);
    });
  });
}

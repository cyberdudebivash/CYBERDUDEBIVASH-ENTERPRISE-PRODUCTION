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
  });
}

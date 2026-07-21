import { describe, expect, it } from "vitest";
import type { NewSupportRequest, SupportRequestRepository } from "./types.js";

const sampleRequest: NewSupportRequest = {
  organizationId: "org_1",
  createdBy: "user_1",
  subject: "Can't download my latest assessment report",
  message: "The export button spins but no file downloads.",
  createdAt: "2026-07-21T00:00:00.000Z",
};

export function describeSupportRequestRepositoryContract(
  name: string,
  createRepository: () => SupportRequestRepository,
) {
  describe(`SupportRequestRepository contract — ${name}`, () => {
    it("returns an empty list before anything is saved", async () => {
      const repo = createRepository();
      expect(await repo.listByUser("user_1")).toEqual([]);
    });

    it("assigns an id and a default 'open' status", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleRequest);
      expect(saved.id).toBeTruthy();
      expect(saved.status).toBe("open");
      expect(saved).toMatchObject(sampleRequest);
    });

    it("returns a saved request via listByUser", async () => {
      const repo = createRepository();
      await repo.save(sampleRequest);
      const [saved] = await repo.listByUser("user_1");
      expect(saved).toMatchObject({ subject: sampleRequest.subject });
    });

    it("scopes listByUser to the requesting user only", async () => {
      const repo = createRepository();
      await repo.save(sampleRequest);
      await repo.save({ ...sampleRequest, createdBy: "user_2", subject: "A different request" });

      const ownRequests = await repo.listByUser("user_1");
      expect(ownRequests).toHaveLength(1);
      expect(ownRequests[0]?.subject).toBe(sampleRequest.subject);
    });

    it("returns newest first", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleRequest, createdAt: "2026-07-20T00:00:00.000Z" });
      await repo.save({ ...sampleRequest, createdAt: "2026-07-22T00:00:00.000Z" });

      const requests = await repo.listByUser("user_1");
      expect(requests.map((request) => request.createdAt)).toEqual([
        "2026-07-22T00:00:00.000Z",
        "2026-07-20T00:00:00.000Z",
      ]);
    });

    it("supports a null organizationId", async () => {
      const repo = createRepository();
      const saved = await repo.save({ ...sampleRequest, organizationId: null });
      expect(saved.organizationId).toBeNull();
    });
  });
}

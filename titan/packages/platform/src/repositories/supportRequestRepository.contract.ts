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

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleRequest);
      const found = await repo.findById(saved.id);
      expect(found).toMatchObject({ id: saved.id, subject: sampleRequest.subject });
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { status: "resolved" })).toBeNull();
    });

    it("update changes the status and persists across a fresh read", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleRequest);
      const updated = await repo.update(saved.id, { status: "resolved" });
      expect(updated?.status).toBe("resolved");

      const reread = await repo.findById(saved.id);
      expect(reread?.status).toBe("resolved");
    });

    it("search with no options returns everything, newest first, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleRequest, createdAt: "2026-07-20T00:00:00.000Z" });
      await repo.save({ ...sampleRequest, createdAt: "2026-07-22T00:00:00.000Z" });

      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.requests.map((r) => r.createdAt)).toEqual([
        "2026-07-22T00:00:00.000Z",
        "2026-07-20T00:00:00.000Z",
      ]);
    });

    it("search filters by a case-insensitive substring across subject/message", async () => {
      const repo = createRepository();
      await repo.save(sampleRequest);
      await repo.save({ ...sampleRequest, subject: "Billing question", message: "Unrelated" });

      const result = await repo.search({ search: "download" });
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]?.subject).toBe(sampleRequest.subject);
    });

    it("search filters by status", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleRequest);
      await repo.update(saved.id, { status: "resolved" });
      await repo.save({ ...sampleRequest, subject: "Still open" });

      const result = await repo.search({ status: "resolved" });
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]?.id).toBe(saved.id);
    });

    it("search filters by organizationId", async () => {
      const repo = createRepository();
      await repo.save(sampleRequest);
      await repo.save({ ...sampleRequest, organizationId: "org_2" });

      const result = await repo.search({ organizationId: "org_2" });
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]?.organizationId).toBe("org_2");
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleRequest, createdAt: `2026-07-${10 + i}T00:00:00.000Z` });
      }
      const result = await repo.search({ page: 2, pageSize: 2 });
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.requests).toHaveLength(2);
    });
  });
}

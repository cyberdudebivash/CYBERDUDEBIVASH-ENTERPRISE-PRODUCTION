import { describe, expect, it } from "vitest";
import type { AuditRepository, NewAuditEvent } from "./types.js";

const sampleEvent: NewAuditEvent = {
  actorId: null,
  organizationId: null,
  action: "lead.created",
  entityType: "lead",
  entityId: "lead_1",
  metadata: { source: "dpdp-scan" },
  createdAt: "2026-07-20T00:00:00.000Z",
};

export function describeAuditRepositoryContract(
  name: string,
  createRepository: () => AuditRepository,
) {
  describe(`AuditRepository contract — ${name}`, () => {
    it("returns an empty list before anything is recorded", async () => {
      const repo = createRepository();
      expect(await repo.list()).toEqual([]);
    });

    it("assigns an id and returns the recorded event", async () => {
      const repo = createRepository();
      const saved = await repo.record(sampleEvent);
      expect(saved.id).toBeTruthy();
      expect(saved).toMatchObject(sampleEvent);
    });

    it("preserves metadata through a round trip", async () => {
      const repo = createRepository();
      await repo.record(sampleEvent);
      const [saved] = await repo.list();
      expect(saved?.metadata).toEqual(sampleEvent.metadata);
    });

    it("supports a null metadata payload", async () => {
      const repo = createRepository();
      await repo.record({ ...sampleEvent, metadata: null });
      const [saved] = await repo.list();
      expect(saved?.metadata).toBeNull();
    });

    it("accumulates multiple events", async () => {
      const repo = createRepository();
      await repo.record(sampleEvent);
      await repo.record({ ...sampleEvent, action: "assessment.created" });
      expect(await repo.list()).toHaveLength(2);
    });
  });
}

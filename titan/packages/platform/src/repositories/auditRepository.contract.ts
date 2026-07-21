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

    // EAP-2: entity-scoped filtering (a single lead's own activity trail).
    it("filters by entityType and entityId together", async () => {
      const repo = createRepository();
      await repo.record(sampleEvent); // lead / lead_1
      await repo.record({ ...sampleEvent, entityId: "lead_2" });
      await repo.record({ ...sampleEvent, entityType: "assessment", entityId: "lead_1" });

      const result = await repo.list({ entityType: "lead", entityId: "lead_1" });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ entityType: "lead", entityId: "lead_1" });
    });

    it("with no filter (or an empty one) behaves exactly like list() with no arguments", async () => {
      const repo = createRepository();
      await repo.record(sampleEvent);
      await repo.record({ ...sampleEvent, entityId: "lead_2" });
      expect(await repo.list({})).toHaveLength(2);
      expect(await repo.list(undefined)).toHaveLength(2);
    });
  });
}

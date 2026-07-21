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

    // EAP-6: the Audit Center's filtered/paginated/sorted search.
    describe("search", () => {
      it("returns every event, newest first, with no options", async () => {
        const repo = createRepository();
        await repo.record(sampleEvent);
        await repo.record({
          ...sampleEvent,
          action: "assessment.created",
          createdAt: "2026-07-20T00:00:01.000Z",
        });
        const result = await repo.search({});
        expect(result.total).toBe(2);
        expect(result.events[0]?.action).toBe("assessment.created");
      });

      it("filters by actorId", async () => {
        const repo = createRepository();
        await repo.record({ ...sampleEvent, actorId: "user_1" });
        await repo.record({ ...sampleEvent, actorId: "user_2" });
        const result = await repo.search({ actorId: "user_1" });
        expect(result.total).toBe(1);
        expect(result.events[0]?.actorId).toBe("user_1");
      });

      it("filters by organizationId", async () => {
        const repo = createRepository();
        await repo.record({ ...sampleEvent, organizationId: "org_1" });
        await repo.record({ ...sampleEvent, organizationId: "org_2" });
        const result = await repo.search({ organizationId: "org_1" });
        expect(result.total).toBe(1);
        expect(result.events[0]?.organizationId).toBe("org_1");
      });

      it("filters by exact action", async () => {
        const repo = createRepository();
        await repo.record(sampleEvent); // lead.created
        await repo.record({ ...sampleEvent, action: "lead.viewed" });
        const result = await repo.search({ action: "lead.created" });
        expect(result.total).toBe(1);
        expect(result.events[0]?.action).toBe("lead.created");
      });

      it("filters by entityType and entityId together", async () => {
        const repo = createRepository();
        await repo.record(sampleEvent); // lead / lead_1
        await repo.record({ ...sampleEvent, entityId: "lead_2" });
        await repo.record({ ...sampleEvent, entityType: "assessment", entityId: "lead_1" });
        const result = await repo.search({ entityType: "lead", entityId: "lead_1" });
        expect(result.total).toBe(1);
      });

      it("filters by a case-insensitive substring against action/entityType/entityId", async () => {
        const repo = createRepository();
        await repo.record(sampleEvent); // action: lead.created, entityType: lead, entityId: lead_1
        await repo.record({
          ...sampleEvent,
          action: "assessment.created",
          entityType: "assessment",
          entityId: "assessment_1",
        });
        const result = await repo.search({ search: "LEAD" });
        expect(result.total).toBe(1);
        expect(result.events[0]?.action).toBe("lead.created");
      });

      it("filters by an inclusive dateFrom/dateTo range", async () => {
        const repo = createRepository();
        await repo.record({ ...sampleEvent, createdAt: "2026-07-19T00:00:00.000Z" });
        await repo.record({ ...sampleEvent, createdAt: "2026-07-20T00:00:00.000Z" });
        await repo.record({ ...sampleEvent, createdAt: "2026-07-21T00:00:00.000Z" });
        const result = await repo.search({
          dateFrom: "2026-07-20T00:00:00.000Z",
          dateTo: "2026-07-20T23:59:59.999Z",
        });
        expect(result.total).toBe(1);
        expect(result.events[0]?.createdAt).toBe("2026-07-20T00:00:00.000Z");
      });

      it("sorts ascending when sortDirection is 'asc', descending otherwise", async () => {
        const repo = createRepository();
        await repo.record({ ...sampleEvent, createdAt: "2026-07-19T00:00:00.000Z" });
        await repo.record({ ...sampleEvent, createdAt: "2026-07-21T00:00:00.000Z" });

        const ascending = await repo.search({ sortDirection: "asc" });
        expect(ascending.events[0]?.createdAt).toBe("2026-07-19T00:00:00.000Z");

        const descending = await repo.search({ sortDirection: "desc" });
        expect(descending.events[0]?.createdAt).toBe("2026-07-21T00:00:00.000Z");
      });

      it("paginates results", async () => {
        const repo = createRepository();
        for (let i = 0; i < 5; i += 1) {
          await repo.record({
            ...sampleEvent,
            entityId: `lead_${i}`,
            createdAt: `2026-07-2${i}T00:00:00.000Z`,
          });
        }
        const page1 = await repo.search({ page: 1, pageSize: 2 });
        expect(page1.events).toHaveLength(2);
        expect(page1.total).toBe(5);
        const page3 = await repo.search({ page: 3, pageSize: 2 });
        expect(page3.events).toHaveLength(1);
      });
    });
  });
}

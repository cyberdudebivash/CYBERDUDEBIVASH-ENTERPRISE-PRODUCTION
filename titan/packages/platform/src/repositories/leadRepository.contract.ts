import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import type { LeadRepository, NewLead } from "./types.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

const sampleLead: NewLead = {
  name: "Asha Rao",
  email: "asha@acme.in",
  company: "Acme Fintech",
  answers: { has_dpo: false },
  result: sampleResult,
  timestamp: "2026-07-20T00:00:00.000Z",
  source: "dpdp-scan",
};

/**
 * Runs the same behavioral assertions against any LeadRepository implementation.
 * Proves the in-memory and D1-backed repositories are actually interchangeable —
 * the entire point of code depending on the interface (types.ts) rather than a
 * concrete store.
 */
export function describeLeadRepositoryContract(
  name: string,
  createRepository: () => LeadRepository,
) {
  describe(`LeadRepository contract — ${name}`, () => {
    it("returns an empty list before anything is saved", async () => {
      const repo = createRepository();
      expect(await repo.list()).toEqual([]);
    });

    it("assigns an id and returns the saved record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      expect(saved.id).toBeTruthy();
      expect(saved).toMatchObject(sampleLead);
    });

    it("makes a saved lead retrievable via list", async () => {
      const repo = createRepository();
      await repo.save(sampleLead);
      const leads = await repo.list();
      expect(leads).toHaveLength(1);
      expect(leads[0]).toMatchObject(sampleLead);
    });

    it("preserves the full answers and result payload through a round trip", async () => {
      const repo = createRepository();
      await repo.save(sampleLead);
      const [saved] = await repo.list();
      expect(saved?.answers).toEqual(sampleLead.answers);
      expect(saved?.result).toEqual(sampleLead.result);
    });

    it("accumulates multiple leads", async () => {
      const repo = createRepository();
      await repo.save(sampleLead);
      await repo.save({ ...sampleLead, email: "second@acme.in" });
      expect(await repo.list()).toHaveLength(2);
    });

    it("defaults organizationId and assessmentId to null when omitted", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      expect(saved.organizationId).toBeNull();
      expect(saved.assessmentId).toBeNull();
    });

    it("persists organizationId and assessmentId when provided", async () => {
      const repo = createRepository();
      const saved = await repo.save({
        ...sampleLead,
        organizationId: "org_1",
        assessmentId: "assessment_1",
      });
      expect(saved.organizationId).toBe("org_1");
      expect(saved.assessmentId).toBe("assessment_1");
      const [listed] = await repo.list();
      expect(listed?.organizationId).toBe("org_1");
      expect(listed?.assessmentId).toBe("assessment_1");
    });

    // EAP-2 lifecycle fields.
    it("defaults lifecycle fields to new/medium/unassigned/no tags", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      expect(saved.status).toBe("new");
      expect(saved.priority).toBe("medium");
      expect(saved.assignedTo).toBeNull();
      expect(saved.tags).toEqual([]);
    });

    it("persists lifecycle fields when provided on save", async () => {
      const repo = createRepository();
      const saved = await repo.save({
        ...sampleLead,
        status: "qualified",
        priority: "urgent",
        assignedTo: "user_1",
        tags: ["hot-lead", "enterprise"],
      });
      expect(saved.status).toBe("qualified");
      expect(saved.priority).toBe("urgent");
      expect(saved.assignedTo).toBe("user_1");
      expect(saved.tags).toEqual(["hot-lead", "enterprise"]);
    });

    it("findById returns the matching record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      const found = await repo.findById(saved.id);
      expect(found).toMatchObject(sampleLead);
    });

    it("findById returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("update returns null for an unknown id", async () => {
      const repo = createRepository();
      expect(await repo.update("does-not-exist", { status: "contacted" })).toBeNull();
    });

    it("update applies only the patched fields, leaving the rest untouched", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      const updated = await repo.update(saved.id, { status: "contacted" });
      expect(updated?.status).toBe("contacted");
      expect(updated?.priority).toBe("medium");
      expect(updated?.name).toBe(sampleLead.name);
    });

    it("update persists across a fresh read (findById/list), not just the return value", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleLead);
      await repo.update(saved.id, {
        status: "converted",
        priority: "low",
        assignedTo: "user_2",
        tags: ["renewal"],
      });
      const reread = await repo.findById(saved.id);
      expect(reread?.status).toBe("converted");
      expect(reread?.priority).toBe("low");
      expect(reread?.assignedTo).toBe("user_2");
      expect(reread?.tags).toEqual(["renewal"]);
    });

    it("update can clear assignedTo back to null", async () => {
      const repo = createRepository();
      const saved = await repo.save({ ...sampleLead, assignedTo: "user_1" });
      const updated = await repo.update(saved.id, { assignedTo: null });
      expect(updated?.assignedTo).toBeNull();
    });

    it("search with no options returns everything, newest first, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, timestamp: "2026-07-19T00:00:00.000Z" });
      await repo.save({
        ...sampleLead,
        email: "second@acme.in",
        timestamp: "2026-07-20T00:00:00.000Z",
      });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.leads).toHaveLength(2);
      expect(result.leads[0]?.email).toBe("second@acme.in");
      expect(result.page).toBe(1);
    });

    it("search filters by a case-insensitive substring across name/email/company", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, company: "Acme Fintech" });
      await repo.save({ ...sampleLead, email: "other@example.com", company: "Globex Retail" });
      const result = await repo.search({ search: "fintech" });
      expect(result.total).toBe(1);
      expect(result.leads[0]?.company).toBe("Acme Fintech");
    });

    it("search filters by status", async () => {
      const repo = createRepository();
      const a = await repo.save(sampleLead);
      await repo.save({ ...sampleLead, email: "b@acme.in" });
      await repo.update(a.id, { status: "qualified" });
      const result = await repo.search({ status: "qualified" });
      expect(result.total).toBe(1);
      expect(result.leads[0]?.id).toBe(a.id);
    });

    it("search filters by priority", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, priority: "urgent" });
      await repo.save({ ...sampleLead, email: "b@acme.in", priority: "low" });
      const result = await repo.search({ priority: "urgent" });
      expect(result.total).toBe(1);
      expect(result.leads[0]?.priority).toBe("urgent");
    });

    it("search filters by assignedTo, including the 'unassigned' sentinel", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, assignedTo: "user_1" });
      await repo.save({ ...sampleLead, email: "b@acme.in" });

      const assigned = await repo.search({ assignedTo: "user_1" });
      expect(assigned.total).toBe(1);
      expect(assigned.leads[0]?.assignedTo).toBe("user_1");

      const unassigned = await repo.search({ assignedTo: "unassigned" });
      expect(unassigned.total).toBe(1);
      expect(unassigned.leads[0]?.assignedTo).toBeNull();
    });

    it("search sorts by riskScore", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, result: { ...sampleResult, score: 20 } });
      await repo.save({
        ...sampleLead,
        email: "b@acme.in",
        result: { ...sampleResult, score: 90 },
      });
      const result = await repo.search({ sortBy: "riskScore", sortDirection: "desc" });
      expect(result.leads.map((lead) => lead.result.score)).toEqual([90, 20]);
    });

    it("search filters by assessmentId (EAP-3 lead linkage)", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, assessmentId: "assessment_1" });
      await repo.save({ ...sampleLead, email: "b@acme.in", assessmentId: "assessment_2" });
      const result = await repo.search({ assessmentId: "assessment_1" });
      expect(result.total).toBe(1);
      expect(result.leads[0]?.assessmentId).toBe("assessment_1");
    });

    it("search filters by organizationId (EAP-4 organization relationships)", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleLead, organizationId: "org_1" });
      await repo.save({ ...sampleLead, email: "b@acme.in", organizationId: "org_2" });
      const result = await repo.search({ organizationId: "org_1" });
      expect(result.total).toBe(1);
      expect(result.leads[0]?.organizationId).toBe("org_1");
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleLead, email: `lead-${i}@acme.in` });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1, sortBy: "name" });
      const secondPage = await repo.search({ pageSize: 2, page: 2, sortBy: "name" });
      expect(firstPage.total).toBe(5);
      expect(firstPage.leads).toHaveLength(2);
      expect(secondPage.leads).toHaveLength(2);
      expect(firstPage.leads[0]?.email).not.toBe(secondPage.leads[0]?.email);
    });
  });
}

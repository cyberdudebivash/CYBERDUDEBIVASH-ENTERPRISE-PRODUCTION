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
  });
}

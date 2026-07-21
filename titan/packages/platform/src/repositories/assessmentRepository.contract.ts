import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRepository, NewAssessment } from "./types.js";

const sampleResult: AssessmentResult = {
  score: 33,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

const sampleAssessment: NewAssessment = {
  organizationId: null,
  createdBy: null,
  framework: "dpdp",
  frameworkVersion: "v1",
  answers: { has_dpo: false },
  result: sampleResult,
  createdAt: "2026-07-20T00:00:00.000Z",
};

export function describeAssessmentRepositoryContract(
  name: string,
  createRepository: () => AssessmentRepository,
) {
  describe(`AssessmentRepository contract — ${name}`, () => {
    it("returns an empty list before anything is saved", async () => {
      const repo = createRepository();
      expect(await repo.list()).toEqual([]);
    });

    it("assigns an id and returns the saved record", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleAssessment);
      expect(saved.id).toBeTruthy();
      expect(saved).toMatchObject(sampleAssessment);
    });

    it("finds an assessment by id, preserving answers and result", async () => {
      const repo = createRepository();
      const saved = await repo.save(sampleAssessment);
      const found = await repo.findById(saved.id);
      expect(found?.answers).toEqual(sampleAssessment.answers);
      expect(found?.result).toEqual(sampleAssessment.result);
    });

    it("returns null when no assessment matches the id", async () => {
      const repo = createRepository();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("associates an organization and creator when provided", async () => {
      const repo = createRepository();
      const saved = await repo.save({
        ...sampleAssessment,
        organizationId: "org_1",
        createdBy: "user_1",
      });
      expect(saved.organizationId).toBe("org_1");
      expect(saved.createdBy).toBe("user_1");
    });

    it("accumulates multiple assessments", async () => {
      const repo = createRepository();
      await repo.save(sampleAssessment);
      await repo.save({ ...sampleAssessment, createdAt: "2026-07-21T00:00:00.000Z" });
      expect(await repo.list()).toHaveLength(2);
    });

    // EAP-3: search().
    it("search with no options returns everything, newest first, in a paginated envelope", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleAssessment, createdAt: "2026-07-19T00:00:00.000Z" });
      await repo.save({ ...sampleAssessment, createdAt: "2026-07-20T00:00:00.000Z" });
      const result = await repo.search({});
      expect(result.total).toBe(2);
      expect(result.assessments).toHaveLength(2);
      expect(result.assessments[0]?.createdAt).toBe("2026-07-20T00:00:00.000Z");
      expect(result.page).toBe(1);
    });

    it("search filters by a case-insensitive substring across id/organizationId/createdBy", async () => {
      const repo = createRepository();
      const saved = await repo.save({ ...sampleAssessment, createdBy: "user_zenith" });
      await repo.save({ ...sampleAssessment, createdBy: "user_other" });
      const result = await repo.search({ search: "zenith" });
      expect(result.total).toBe(1);
      expect(result.assessments[0]?.id).toBe(saved.id);
    });

    it("search filters by framework", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleAssessment, framework: "dpdp" });
      await repo.save({ ...sampleAssessment, framework: "iso27001" });
      const result = await repo.search({ framework: "iso27001" });
      expect(result.total).toBe(1);
      expect(result.assessments[0]?.framework).toBe("iso27001");
    });

    it("search filters by riskLevel", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleAssessment, result: { ...sampleResult, riskLevel: "critical" } });
      await repo.save({ ...sampleAssessment, result: { ...sampleResult, riskLevel: "low" } });
      const result = await repo.search({ riskLevel: "critical" });
      expect(result.total).toBe(1);
      expect(result.assessments[0]?.result.riskLevel).toBe("critical");
    });

    it("search sorts by riskScore", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleAssessment, result: { ...sampleResult, score: 20 } });
      await repo.save({ ...sampleAssessment, result: { ...sampleResult, score: 90 } });
      const result = await repo.search({ sortBy: "riskScore", sortDirection: "desc" });
      expect(result.assessments.map((assessment) => assessment.result.score)).toEqual([90, 20]);
    });

    it("search filters by organizationId (EAP-4 organization relationships)", async () => {
      const repo = createRepository();
      await repo.save({ ...sampleAssessment, organizationId: "org_1" });
      await repo.save({ ...sampleAssessment, organizationId: "org_2" });
      const result = await repo.search({ organizationId: "org_1" });
      expect(result.total).toBe(1);
      expect(result.assessments[0]?.organizationId).toBe("org_1");
    });

    it("search paginates", async () => {
      const repo = createRepository();
      for (let i = 0; i < 5; i += 1) {
        await repo.save({ ...sampleAssessment, createdBy: `user_${i}` });
      }
      const firstPage = await repo.search({ pageSize: 2, page: 1, sortBy: "framework" });
      const secondPage = await repo.search({ pageSize: 2, page: 2, sortBy: "framework" });
      expect(firstPage.total).toBe(5);
      expect(firstPage.assessments).toHaveLength(2);
      expect(secondPage.assessments).toHaveLength(2);
      expect(firstPage.assessments[0]?.createdBy).not.toBe(secondPage.assessments[0]?.createdBy);
    });
  });
}

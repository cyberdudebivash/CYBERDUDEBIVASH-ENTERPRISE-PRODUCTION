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
  });
}

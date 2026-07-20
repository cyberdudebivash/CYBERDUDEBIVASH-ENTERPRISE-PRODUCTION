import type { AssessmentRecord, AssessmentRepository, NewAssessment } from "./types.js";

export function createInMemoryAssessmentRepository(): AssessmentRepository {
  const assessments: AssessmentRecord[] = [];

  return {
    async save(assessment: NewAssessment): Promise<AssessmentRecord> {
      const record: AssessmentRecord = { id: crypto.randomUUID(), ...assessment };
      assessments.push(record);
      return record;
    },

    async findById(id: string): Promise<AssessmentRecord | null> {
      return assessments.find((assessment) => assessment.id === id) ?? null;
    },

    async list(): Promise<AssessmentRecord[]> {
      return [...assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

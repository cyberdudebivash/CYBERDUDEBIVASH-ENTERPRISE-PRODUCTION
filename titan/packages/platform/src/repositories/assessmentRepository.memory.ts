import type {
  AssessmentRecord,
  AssessmentRepository,
  AssessmentSearchOptions,
  AssessmentSearchResult,
  NewAssessment,
} from "./types.js";

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

    async search(options: AssessmentSearchOptions): Promise<AssessmentSearchResult> {
      let matched = [...assessments];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (assessment) =>
            assessment.id.toLowerCase().includes(needle) ||
            (assessment.organizationId?.toLowerCase().includes(needle) ?? false) ||
            (assessment.createdBy?.toLowerCase().includes(needle) ?? false),
        );
      }
      if (options.framework) {
        matched = matched.filter((assessment) => assessment.framework === options.framework);
      }
      if (options.riskLevel) {
        matched = matched.filter((assessment) => assessment.result.riskLevel === options.riskLevel);
      }

      const direction = options.sortDirection === "asc" ? 1 : -1;
      const sortBy = options.sortBy ?? "createdAt";
      matched.sort((a, b) => {
        const left = sortKey(a, sortBy);
        const right = sortKey(b, sortBy);
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });

      const total = matched.length;
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      const paged = matched.slice(start, start + pageSize);

      return { assessments: paged, total, page, pageSize };
    },
  };
}

function sortKey(
  assessment: AssessmentRecord,
  sortBy: NonNullable<AssessmentSearchOptions["sortBy"]>,
): string | number {
  switch (sortBy) {
    case "createdAt":
      return assessment.createdAt;
    case "riskScore":
      return assessment.result.score;
    case "framework":
      return assessment.framework.toLowerCase();
  }
}

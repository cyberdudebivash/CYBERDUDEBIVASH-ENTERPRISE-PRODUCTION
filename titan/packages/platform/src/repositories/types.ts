import type { Answers, AssessmentResult } from "@titan/assessment-core";

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  answers: Answers;
  result: AssessmentResult;
  timestamp: string;
  source: string;
}

/** What's known before a repository assigns an id. */
export type NewLead = Omit<LeadRecord, "id">;

// Business logic (the Worker's router, and titan/apps/web once Workstream 7 wires
// it up) depends on this interface only — never on D1 directly (DECISION_LOG.md).
// leadRepository.memory.ts and leadRepository.d1.ts are two interchangeable
// implementations of it, proven interchangeable by leadRepository.contract.ts.
export interface LeadRepository {
  save(lead: NewLead): Promise<LeadRecord>;
  list(): Promise<LeadRecord[]>;
}

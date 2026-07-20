import { createD1AssessmentRepository } from "./assessmentRepository.d1.js";
import { describeAssessmentRepositoryContract } from "./assessmentRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeAssessmentRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1AssessmentRepository(createDb()),
);

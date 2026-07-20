import { createInMemoryAssessmentRepository } from "./assessmentRepository.memory.js";
import { describeAssessmentRepositoryContract } from "./assessmentRepository.contract.js";

describeAssessmentRepositoryContract("in-memory", () => createInMemoryAssessmentRepository());

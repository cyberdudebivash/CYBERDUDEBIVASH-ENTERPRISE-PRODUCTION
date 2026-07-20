import { createInMemoryLeadRepository } from "./leadRepository.memory.js";
import { describeLeadRepositoryContract } from "./leadRepository.contract.js";

describeLeadRepositoryContract("in-memory", () => createInMemoryLeadRepository());

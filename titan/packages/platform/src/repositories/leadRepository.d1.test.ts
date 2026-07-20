import { createD1LeadRepository } from "./leadRepository.d1.js";
import { describeLeadRepositoryContract } from "./leadRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeLeadRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1LeadRepository(createDb()),
);

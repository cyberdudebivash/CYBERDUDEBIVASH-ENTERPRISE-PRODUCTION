import { createD1LeadRepository } from "./leadRepository.d1.js";
import { describeLeadRepositoryContract } from "./leadRepository.contract.js";
import { createFakeD1 } from "./testUtils/fakeD1.js";

describeLeadRepositoryContract("D1 (fake)", () => createD1LeadRepository(createFakeD1()));

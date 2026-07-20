import { createD1OrganizationRepository } from "./organizationRepository.d1.js";
import { describeOrganizationRepositoryContract } from "./organizationRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeOrganizationRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1OrganizationRepository(createDb()),
);

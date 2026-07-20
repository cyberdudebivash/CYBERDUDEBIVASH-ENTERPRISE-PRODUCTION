import { createD1UserProfileRepository } from "./userProfileRepository.d1.js";
import { describeUserProfileRepositoryContract } from "./userProfileRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeUserProfileRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1UserProfileRepository(createDb()),
);

import { createInMemoryUserProfileRepository } from "./userProfileRepository.memory.js";
import { describeUserProfileRepositoryContract } from "./userProfileRepository.contract.js";

describeUserProfileRepositoryContract("in-memory", () => createInMemoryUserProfileRepository());

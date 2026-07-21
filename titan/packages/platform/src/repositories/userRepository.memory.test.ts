import { createInMemoryUserRepository } from "./userRepository.memory.js";
import { describeUserRepositoryContract } from "./userRepository.contract.js";

describeUserRepositoryContract("in-memory", (seed) =>
  Promise.resolve(createInMemoryUserRepository(seed)),
);

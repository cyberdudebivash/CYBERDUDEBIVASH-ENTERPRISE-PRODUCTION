import { createD1UserRepository } from "./userRepository.d1.js";
import { describeUserRepositoryContract } from "./userRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";
import type { UserRecord } from "./types.js";

const createDb = await createTestD1Factory();

/** Seeds real rows into the real `users` table (via a direct `INSERT`, since
 * `UserRepository` itself has no `save`) before handing back the repository
 * — mirroring how a real deployment's rows get there (`@auth/d1-adapter`'s
 * own writes), not a shortcut this test takes for convenience alone. */
async function setup(seed: UserRecord[]) {
  const db = createDb();
  for (const user of seed) {
    await db
      .prepare(`INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, ?, ?)`)
      .bind(user.id, user.name, user.email, user.emailVerified, user.image)
      .run();
  }
  return createD1UserRepository(db);
}

describeUserRepositoryContract("D1 (real SQLite via sql.js)", setup);

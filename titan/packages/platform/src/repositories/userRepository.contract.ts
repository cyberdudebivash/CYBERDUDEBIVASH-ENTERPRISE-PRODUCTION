import { describe, expect, it } from "vitest";
import type { UserRecord, UserRepository } from "./types.js";

const sampleUsers: UserRecord[] = [
  { id: "user_1", name: "Asha Rao", email: "asha@acme.example", emailVerified: null, image: null },
  {
    id: "user_2",
    name: "Ben Fischer",
    email: "ben@beta.example",
    emailVerified: "2026-07-20T00:00:00.000Z",
    image: null,
  },
  {
    id: "user_3",
    name: "Chidi Okoye",
    email: "chidi@acme.example",
    emailVerified: null,
    image: null,
  },
];

/**
 * Proves the in-memory and D1-backed `UserRepository` implementations are
 * interchangeable — same intent as every other `*.contract.ts` in this
 * package, but a different shape: `UserRepository` has no `save` (see
 * `UserRecord`'s doc comment, types.ts), so there is no in-contract write to
 * seed data with. `setup` takes the seed rows directly and is async
 * (unlike every other contract's sync `createRepository`) because the D1
 * variant genuinely needs to `await` a real `INSERT INTO users` before
 * returning the repository — mirroring how a real deployment's rows would
 * already exist, written by `@auth/d1-adapter`. The memory variant just
 * wraps them, resolved immediately.
 */
export function describeUserRepositoryContract(
  name: string,
  setup: (seed: UserRecord[]) => Promise<UserRepository>,
) {
  describe(`UserRepository contract — ${name}`, () => {
    it("returns null for an unknown id", async () => {
      const repo = await setup([]);
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("finds a seeded user by id", async () => {
      const repo = await setup(sampleUsers);
      const found = await repo.findById("user_2");
      expect(found).toMatchObject({ id: "user_2", name: "Ben Fischer", email: "ben@beta.example" });
    });

    // Same direction-default convention as OrganizationRepository.search
    // (organizationRepository.memory.ts/.d1.ts): `sortDirection` defaults to
    // descending when omitted entirely — real callers (useUserSearch.ts,
    // mirroring useOrganizationSearch.ts) always pass "asc" explicitly for a
    // directory listing, the same way useOrganizationSearch.ts does.
    it("search with no options returns every user, sorted by name descending by default", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({});
      expect(result.total).toBe(3);
      expect(result.users.map((user) => user.id)).toEqual(["user_3", "user_2", "user_1"]);
    });

    it("search matches a case-insensitive substring of name", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({ search: "ben" });
      expect(result.users.map((user) => user.id)).toEqual(["user_2"]);
    });

    it("search matches a case-insensitive substring of email", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({ search: "ACME.EXAMPLE" });
      expect(result.users.map((user) => user.id).sort()).toEqual(["user_1", "user_3"]);
    });

    it("search sorts by email when requested", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({ sortBy: "email", sortDirection: "asc" });
      expect(result.users.map((user) => user.id)).toEqual(["user_1", "user_2", "user_3"]);
    });

    it("search sorts descending when requested", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({ sortBy: "name", sortDirection: "desc" });
      expect(result.users.map((user) => user.id)).toEqual(["user_3", "user_2", "user_1"]);
    });

    it("search paginates", async () => {
      const repo = await setup(sampleUsers);
      const result = await repo.search({ page: 2, pageSize: 1 });
      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.id).toBe("user_2");
    });
  });
}

import type { UserRecord, UserRepository, UserSearchOptions, UserSearchResult } from "./types.js";

/** EAP-5: in-memory `UserRepository`. Unlike every other in-memory
 * repository in this package, this one is a view, not a store — it's seeded
 * directly with the same `UserRecord[]` the real D1 implementation would
 * read from Auth.js's own `users` table, since nothing in this repository
 * ever writes (see `UserRecord`'s own doc comment for why). Tests seed it
 * via the second constructor argument; production code never calls this at
 * all in-memory (worker.ts always wires the D1 implementation). */
export function createInMemoryUserRepository(seed: UserRecord[] = []): UserRepository {
  const users: UserRecord[] = [...seed];

  return {
    async findById(id: string): Promise<UserRecord | null> {
      return users.find((user) => user.id === id) ?? null;
    },

    async search(options: UserSearchOptions): Promise<UserSearchResult> {
      let matched = [...users];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (user) =>
            (user.name?.toLowerCase().includes(needle) ?? false) ||
            (user.email?.toLowerCase().includes(needle) ?? false),
        );
      }

      const direction = options.sortDirection === "asc" ? 1 : -1;
      const sortBy = options.sortBy ?? "name";
      matched.sort((a, b) => {
        const left = sortKey(a, sortBy);
        const right = sortKey(b, sortBy);
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });

      const total = matched.length;
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      const paged = matched.slice(start, start + pageSize);

      return { users: paged, total, page, pageSize };
    },
  };
}

function sortKey(user: UserRecord, sortBy: NonNullable<UserSearchOptions["sortBy"]>): string {
  switch (sortBy) {
    case "name":
      return user.name?.toLowerCase() ?? "";
    case "email":
      return user.email?.toLowerCase() ?? "";
  }
}

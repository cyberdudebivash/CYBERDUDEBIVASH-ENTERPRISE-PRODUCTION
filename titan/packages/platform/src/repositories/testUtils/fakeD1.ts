import type { D1Database, D1Result } from "@cloudflare/workers-types";

/**
 * A minimal fake of the two query shapes this package actually issues
 * (`INSERT INTO leads...`, `SELECT * FROM leads ORDER BY created_at DESC`) — real
 * enough to prove leadRepository.d1.ts's SQL construction, parameter binding, and
 * row mapping are correct.
 *
 * It is NOT a SQLite engine: query syntax itself isn't validated the way real D1
 * would (a typo in the SQL string here would still "work" against this fake).
 * Closing that gap needs `wrangler dev`/`@cloudflare/vitest-pool-workers` against
 * real D1 — not done in this pass (ARCHITECTURE.md's Module 1 discovery /
 * DECISION_LOG.md explain why: this workspace's other packages are on Vitest 3,
 * vitest-pool-workers currently requires Vitest 4 — a deliberate workspace-wide
 * upgrade decision, not something to bump silently as a side effect here).
 */
export function createFakeD1(): D1Database {
  const rows: Record<string, unknown>[] = [];

  function prepare(query: string) {
    let boundArgs: unknown[] = [];
    const normalized = query.trim().toUpperCase();

    const statement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return statement;
      },
      async run() {
        if (normalized.startsWith("INSERT")) {
          const [id, name, email, company, answersJson, resultJson, source, createdAt] = boundArgs;
          rows.push({
            id,
            name,
            email,
            company,
            answers_json: answersJson,
            result_json: resultJson,
            source,
            created_at: createdAt,
          });
        }
        return { success: true, meta: {} } as unknown as D1Result;
      },
      async all() {
        const sorted = [...rows].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        );
        return { success: true, results: sorted, meta: {} } as unknown as D1Result;
      },
      async first() {
        return (rows[0] ?? null) as never;
      },
      raw: async () => rows as never,
    };

    return statement;
  }

  return { prepare } as unknown as D1Database;
}

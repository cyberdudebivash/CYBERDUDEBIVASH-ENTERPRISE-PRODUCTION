import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database as SqlJsDatabase } from "sql.js";
import type { D1Database, D1PreparedStatement, D1Result } from "@cloudflare/workers-types";
import { loadSqlJsEngine } from "./sqlJsEngine.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../migrations");

function readMigrationsSql(): string {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  return files.map((file) => readFileSync(join(migrationsDir, file), "utf-8")).join("\n");
}

/**
 * Real SQLite (sql.js, SQLite compiled to WASM) running this package's actual
 * migrations/*.sql — not a hand-rolled string-matching fake. Repository tests
 * run against real SQL parsing, constraints, and joins, closing the "my fake
 * double is wrong in exactly the same way my repository code is wrong" risk
 * a hand-written double can't rule out. It is still not workerd/D1 itself —
 * DECISION_LOG.md's Vitest-4/@cloudflare/vitest-pool-workers gap remains
 * genuinely open — but this is real SQL semantics, not string matching.
 *
 * Returns a factory rather than a single database so contract tests keep
 * their existing shape (`createRepository()` called fresh per `it()`,
 * proving isolation) — only the one-time WASM compile is async.
 */
export async function createTestD1Factory(): Promise<() => D1Database> {
  const SQL = await loadSqlJsEngine();
  const migrationSql = readMigrationsSql();

  return () => {
    const db = new SQL.Database();
    db.run(migrationSql);
    return wrapAsD1(db);
  };
}

function wrapAsD1(db: SqlJsDatabase): D1Database {
  function prepare(query: string): D1PreparedStatement {
    let boundArgs: unknown[] = [];

    function runQuery<T>(): T[] {
      const stmt = db.prepare(query);
      try {
        stmt.bind(boundArgs as (string | number | null)[]);
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        return rows;
      } finally {
        stmt.free();
      }
    }

    const statement: D1PreparedStatement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return statement;
      },
      async run<T = unknown>() {
        db.run(query, boundArgs as (string | number | null)[]);
        return { success: true, results: [], meta: {} } as unknown as D1Result<T>;
      },
      async all<T = unknown>() {
        return { success: true, results: runQuery<T>(), meta: {} } as unknown as D1Result<T>;
      },
      async first<T = unknown>() {
        const [row] = runQuery<T>();
        return (row ?? null) as unknown as T;
      },
      raw: (async () => runQuery()) as unknown as D1PreparedStatement["raw"],
    } as unknown as D1PreparedStatement;

    return statement;
  }

  return { prepare } as unknown as D1Database;
}

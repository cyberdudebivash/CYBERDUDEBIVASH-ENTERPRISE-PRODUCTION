import initSqlJs, { type SqlJsStatic } from "sql.js";

let enginePromise: Promise<SqlJsStatic> | null = null;

/**
 * Loads sql.js's WASM SQLite build once per test worker. Every repository
 * test file awaits this at module scope (top-level await), then creates as
 * many fresh in-memory databases as it needs synchronously — the WASM
 * compile is the only genuinely async part.
 */
export function loadSqlJsEngine(): Promise<SqlJsStatic> {
  enginePromise ??= initSqlJs();
  return enginePromise;
}

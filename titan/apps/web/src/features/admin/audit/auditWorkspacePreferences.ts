/**
 * Saved filters and column selection (EAP-6 Workstream 1) — same
 * `localStorage`-backed, per-browser, real-but-not-synced approach as
 * `organizationWorkspacePreferences.ts`/`userWorkspacePreferences.ts`
 * (EAP-4/EAP-5), including the same defensive (try/catch, shape-checked)
 * reads. See DECISION_LOG.md's EAP-2 entry for why this stays a named,
 * honest limitation rather than a server-side "saved views" table.
 */

export interface AuditFilterValues {
  search: string;
  actorId: string;
  organizationId: string;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
}

export interface SavedAuditFilter {
  name: string;
  filters: AuditFilterValues;
  sortDirection: "asc" | "desc";
}

const SAVED_FILTERS_KEY = "titan-admin-audit-saved-filters";
const VISIBLE_COLUMNS_KEY = "titan-admin-audit-visible-columns";

export const OPTIONAL_COLUMNS = ["actor", "organization", "metadata"] as const;
export type OptionalColumnId = (typeof OPTIONAL_COLUMNS)[number];
const DEFAULT_VISIBLE_COLUMNS: OptionalColumnId[] = ["actor", "organization"];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — a saved filter/column choice not
    // persisting is a minor UX regression, not something worth surfacing as
    // an error to a user reviewing the audit trail.
  }
}

export function listSavedFilters(): SavedAuditFilter[] {
  return readJson<SavedAuditFilter[]>(SAVED_FILTERS_KEY, []);
}

export function saveFilter(filter: SavedAuditFilter): void {
  const existing = listSavedFilters().filter((saved) => saved.name !== filter.name);
  writeJson(SAVED_FILTERS_KEY, [...existing, filter]);
}

export function deleteSavedFilter(name: string): void {
  writeJson(
    SAVED_FILTERS_KEY,
    listSavedFilters().filter((saved) => saved.name !== name),
  );
}

export function getVisibleOptionalColumns(): OptionalColumnId[] {
  const stored = readJson<string[]>(VISIBLE_COLUMNS_KEY, DEFAULT_VISIBLE_COLUMNS);
  return stored.filter((id): id is OptionalColumnId =>
    (OPTIONAL_COLUMNS as readonly string[]).includes(id),
  );
}

export function setVisibleOptionalColumns(columns: OptionalColumnId[]): void {
  writeJson(VISIBLE_COLUMNS_KEY, columns);
}

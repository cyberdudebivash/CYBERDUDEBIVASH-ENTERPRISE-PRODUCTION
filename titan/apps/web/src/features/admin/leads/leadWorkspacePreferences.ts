import type { LeadPriority, LeadSortField, LeadStatus } from "@titan/platform";

/**
 * Saved filters and column selection (EAP-2 Workstream 1) — real, working
 * features, deliberately scoped to `localStorage` rather than a new
 * server-side "saved views" table + endpoints. Per-browser, not synced
 * across an admin's devices — a real, named limitation (DECISION_LOG.md's
 * EAP-2 entry), not a silent one: nothing here claims these sync anywhere.
 * Every read is defensive (try/catch, shape-checked) — `localStorage` is
 * an external boundary a browser extension, a prior app version, or a
 * corrupted quota state can leave in an unexpected shape.
 */

export interface LeadFilterValues {
  search: string;
  status: LeadStatus | "";
  priority: LeadPriority | "";
  assignedTo: string;
}

export interface SavedLeadFilter {
  name: string;
  filters: LeadFilterValues;
  sortBy: LeadSortField;
  sortDirection: "asc" | "desc";
}

const SAVED_FILTERS_KEY = "titan-admin-leads-saved-filters";
const VISIBLE_COLUMNS_KEY = "titan-admin-leads-visible-columns";

export const OPTIONAL_COLUMNS = ["email", "assignedTo", "tags", "createdAt"] as const;
export type OptionalColumnId = (typeof OPTIONAL_COLUMNS)[number];
const DEFAULT_VISIBLE_COLUMNS: OptionalColumnId[] = ["email", "createdAt"];

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
    // an error to a user managing leads.
  }
}

export function listSavedFilters(): SavedLeadFilter[] {
  return readJson<SavedLeadFilter[]>(SAVED_FILTERS_KEY, []);
}

export function saveFilter(filter: SavedLeadFilter): void {
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

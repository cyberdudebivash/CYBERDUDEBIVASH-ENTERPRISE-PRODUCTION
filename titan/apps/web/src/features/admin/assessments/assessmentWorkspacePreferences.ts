import type { AssessmentSortField } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";

/**
 * Saved filters and column selection (EAP-3 Workstream 1) — same
 * `localStorage`-backed, per-browser, real-but-not-synced approach as
 * `leadWorkspacePreferences.ts` (EAP-2), including the same defensive
 * (try/catch, shape-checked) reads. See DECISION_LOG.md's EAP-2 entry for
 * why this stays a named, honest limitation rather than a server-side
 * "saved views" table this phase doesn't need.
 */

export interface AssessmentFilterValues {
  search: string;
  framework: string;
  riskLevel: RiskLevel | "";
}

export interface SavedAssessmentFilter {
  name: string;
  filters: AssessmentFilterValues;
  sortBy: AssessmentSortField;
  sortDirection: "asc" | "desc";
}

const SAVED_FILTERS_KEY = "titan-admin-assessments-saved-filters";
const VISIBLE_COLUMNS_KEY = "titan-admin-assessments-visible-columns";

export const OPTIONAL_COLUMNS = ["createdBy", "createdAt"] as const;
export type OptionalColumnId = (typeof OPTIONAL_COLUMNS)[number];
const DEFAULT_VISIBLE_COLUMNS: OptionalColumnId[] = ["createdAt"];

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
    // an error to a user reviewing assessments.
  }
}

export function listSavedFilters(): SavedAssessmentFilter[] {
  return readJson<SavedAssessmentFilter[]>(SAVED_FILTERS_KEY, []);
}

export function saveFilter(filter: SavedAssessmentFilter): void {
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

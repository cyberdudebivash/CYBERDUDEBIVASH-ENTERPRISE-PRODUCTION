// Generic, reusable validation primitives every domain validator composes
// instead of hand-rolling its own version. Pure functions only: no I/O, no
// network access, no filesystem mutation, no HTML parsing — every function
// here reads plain data it's given and returns plain data describing what
// it found. This is the one file every one of the 16 domain validators
// imports from, so duplicate-detection / reference-resolution / missing-
// field logic is written exactly once.

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  /** Stable machine-readable code, e.g. "PAGE_DUPLICATE_ID" — grouped by the validator that raised it. */
  code: string;
  message: string;
  /** Where the issue was found: an entity id, a page path, a group of ids. */
  location: string;
}

export interface ValidationResult {
  validator: string;
  issues: ValidationIssue[];
}

export function issue(severity: ValidationSeverity, code: string, message: string, location: string): ValidationIssue {
  return { severity, code, message, location };
}

export function makeResult(validator: string, issues: ValidationIssue[]): ValidationResult {
  return { validator, issues };
}

/**
 * Groups items by a derived key and returns only the groups with more than
 * one member. The shared engine behind every duplicate-detection check
 * (ids, paths, titles, keywords, canonical URLs, KG entity ids...) — none
 * of the 16 validators hand-roll their own grouping loop.
 */
export function findDuplicates<T, K>(items: readonly T[], keyFn: (item: T) => K | undefined): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (key === undefined) continue;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  const duplicates = new Map<K, T[]>();
  for (const [key, group] of groups) {
    if (group.length > 1) duplicates.set(key, group);
  }
  return duplicates;
}

/** Builds the set of valid ids a reference field is allowed to point at. */
export function collectIds<T>(items: readonly T[], idFn: (item: T) => string): Set<string> {
  return new Set(items.map(idFn));
}

/**
 * The one place "does this reference resolve?" is decided. Every
 * relationship / foreign-key-style field across the model (relatedServices,
 * authorId, categoryIds, KG relationship endpoints, brand refs...) calls
 * this instead of reimplementing set-membership plus issue construction.
 * Returns undefined (no issue) when refId itself is absent — a field being
 * unset is a completeness concern for a different validator, not a broken
 * reference.
 */
export function checkReference(
  refId: string | undefined,
  validIds: ReadonlySet<string>,
  code: string,
  describe: (refId: string) => string,
  location: string,
): ValidationIssue | undefined {
  if (refId === undefined) return undefined;
  if (validIds.has(refId)) return undefined;
  return issue("error", code, describe(refId), location);
}

/**
 * The shared definition of "missing" every completeness check (commercial
 * fields, images, descriptions...) uses: absent, null, a blank string, or
 * an empty array all count — a value that's technically present but empty
 * is exactly as unusable to a future generator as one that's absent.
 */
export function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Counts how many of `items` are NOT missing `selector(item)` — the shared engine behind every coverage/completeness percentage in the report. */
export function coverageCount<T>(items: readonly T[], selector: (item: T) => unknown): number {
  return items.filter((item) => !isMissing(selector(item))).length;
}

/**
 * Small, shared validation building blocks (Workstream 7). Both
 * validateNewLead and validateNewAssessment (router.ts) compose these
 * instead of each hand-rolling their own field checks — the duplication
 * that existed when leads.ts's router.ts was the only consumer becomes a
 * real problem the moment a second endpoint needs the same checks, which
 * Workstream 3's assessments endpoints now do.
 */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

export function requireJsonObject(
  value: unknown,
  label: string,
): ValidationResult<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${label} must be a JSON object`);
  }
  return ok(value as Record<string, unknown>);
}

export function requireNonEmptyString(
  record: Record<string, unknown>,
  field: string,
): ValidationResult<string> {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    return fail(`Missing or invalid field: ${field}`);
  }
  return ok(value);
}

export function optionalNullableString(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function requirePlainObject(
  record: Record<string, unknown>,
  field: string,
): ValidationResult<Record<string, unknown>> {
  const value = record[field];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`Missing or invalid field: ${field}`);
  }
  return ok(value as Record<string, unknown>);
}

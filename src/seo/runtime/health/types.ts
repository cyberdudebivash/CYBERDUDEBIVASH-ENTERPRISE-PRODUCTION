export type SEORuntimeHealthStatus = "healthy" | "warning" | "error";

/**
 * The Runtime's platform-wide self-check — distinct from
 * SEORuntimeDiagnostics, which is scoped to one `generateSEO(pageId)`
 * call. `configuration`/`validation`/`relationships`/`commercial` mirror
 * the four domains the RESUME prompt names explicitly; `pipeline`
 * additionally exercises the full pipeline (every stage, for every real
 * page) as the one check that would catch an integration failure none
 * of the other four dimensions would, on their own, surface.
 */
export interface SEORuntimeHealthCheck {
  status: SEORuntimeHealthStatus;
  checkedAt: string;
  configuration: SEORuntimeHealthStatus;
  pipeline: SEORuntimeHealthStatus;
  relationships: SEORuntimeHealthStatus;
  validation: SEORuntimeHealthStatus;
  commercial: SEORuntimeHealthStatus;
  issues: string[];
}

/** PRD-1: production configuration validation.
 *
 * Cloudflare Workers has no separate "startup" phase to hook — `env`
 * bindings only exist inside `fetch(request, env, ctx)`, not at module
 * load time — so there is no way to fail a deploy at boot the way a
 * long-running Node server can fail before `app.listen()`. This function
 * is the closest honest equivalent: a pure, side-effect-free check worker.ts
 * runs on every request (cheap — no I/O) so a misconfigured non-local
 * environment surfaces immediately in `GET /api/operations/summary`
 * (EAP-7's existing operational-status endpoint) and in a one-time-per-isolate
 * warning log, rather than failing silently until something downstream
 * breaks in a more confusing way (e.g. every CORS preflight rejected with no
 * obvious cause).
 *
 * Deliberately narrow: this checks the same two vars this codebase has
 * always required for a real deployment to function at all (`AUTH_SECRET`,
 * `ALLOWED_ORIGIN` — see `.dev.vars.example` and `wrangler.toml`'s own
 * comments), not a speculative general-purpose schema for config that
 * doesn't exist yet.
 */

export interface EnvLike {
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string;
  AUTH_SECRET?: string;
}

export interface ConfigIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface ConfigValidationResult {
  environment: string;
  /** True in every local/test context — the checks below only apply once a
   * deployment claims to be `staging`/`production` via `wrangler.toml`'s
   * per-environment `[vars] ENVIRONMENT`. */
  isProductionTier: boolean;
  valid: boolean;
  issues: ConfigIssue[];
}

export const DEFAULT_ENVIRONMENT_NAME = "local development (never deployed)";

/** The literal placeholder value shipped in `.dev.vars.example` — flagged
 * directly if it ever reaches a non-local environment unchanged, the same
 * real mistake `.dev.vars.example`'s own instructions already warn against
 * ("generate a real value yourself: openssl rand -base64 32"). */
const DEV_PLACEHOLDER_AUTH_SECRET = "dev-only-placeholder-generate-your-own-32-byte-secret";

const PRODUCTION_TIER_ENVIRONMENTS = new Set(["staging", "production"]);

export function validateProductionConfig(env: EnvLike): ConfigValidationResult {
  const environment = env.ENVIRONMENT ?? DEFAULT_ENVIRONMENT_NAME;
  const isProductionTier = PRODUCTION_TIER_ENVIRONMENTS.has(environment);
  const issues: ConfigIssue[] = [];

  if (isProductionTier) {
    if (!env.AUTH_SECRET) {
      issues.push({
        field: "AUTH_SECRET",
        severity: "error",
        message: "AUTH_SECRET is not set — /api/auth/* will not exist on this deployment",
      });
    } else if (env.AUTH_SECRET === DEV_PLACEHOLDER_AUTH_SECRET) {
      issues.push({
        field: "AUTH_SECRET",
        severity: "error",
        message: "AUTH_SECRET is still the local-dev placeholder value from .dev.vars.example",
      });
    }

    if (!env.ALLOWED_ORIGIN) {
      issues.push({
        field: "ALLOWED_ORIGIN",
        severity: "error",
        message:
          "ALLOWED_ORIGIN is not set — every real cross-origin browser request will be rejected by CORS",
      });
    } else if (
      env.ALLOWED_ORIGIN.includes("localhost") ||
      env.ALLOWED_ORIGIN.includes("127.0.0.1")
    ) {
      issues.push({
        field: "ALLOWED_ORIGIN",
        severity: "error",
        message: `ALLOWED_ORIGIN ("${env.ALLOWED_ORIGIN}") is a localhost value in a "${environment}" environment`,
      });
    } else if (!env.ALLOWED_ORIGIN.startsWith("https://")) {
      issues.push({
        field: "ALLOWED_ORIGIN",
        severity: "warning",
        message: `ALLOWED_ORIGIN ("${env.ALLOWED_ORIGIN}") does not use https:// in a "${environment}" environment`,
      });
    }
  }

  return {
    environment,
    isProductionTier,
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

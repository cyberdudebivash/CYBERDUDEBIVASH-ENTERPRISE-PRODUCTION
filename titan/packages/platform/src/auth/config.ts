import type { AuthConfig } from "@auth/core";
import type { EmailConfig } from "@auth/core/providers/email";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import type { D1Database } from "@cloudflare/workers-types";
import { createLogger, type Logger } from "../observability/logger.js";

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface AuthConfigOptions {
  db: D1Database;
  /**
   * A single secret, or an array for rotation (RC1 Workstream 2 —
   * "secret rotation guidance"): @auth/core tries every entry in order when
   * decrypting an existing session/JWT, but only ever signs *new* ones with
   * the first. To rotate: prepend the new secret (index 0) ahead of the old
   * one, deploy, and once every session that could have been signed with
   * the old secret has expired (`session.maxAge`, 30 days by default),
   * remove the old one. Never reorder or drop a secret while sessions
   * signed with it could still be live, or those sessions become
   * unrecoverable (which is the correct failure mode for a compromised
   * secret, just not one you want to hit by accident).
   */
  secret: string | string[];
  /** Real value required before any deployment — trustHost:true is only
   * safe when the Worker's own routing controls what Host header is
   * possible, which is true for local `wrangler dev` and stays true once
   * this is actually deployed behind Cloudflare's own routing. */
  trustHost?: boolean;
  google?: OAuthCredentials;
  github?: OAuthCredentials;
  logger?: Logger;
}

/**
 * Provider abstraction (Workstream 5, DECISION_LOG.md's "authentication
 * abstraction layer" decision): application code depends on this factory,
 * never on @auth/core's Provider/AuthConfig types directly, so adding or
 * swapping a provider later is a change here, not at every call site.
 *
 * Google/GitHub are only registered when real credentials are supplied —
 * this project has never had either (DECISION_LOG.md) — rather than being
 * registered with empty strings and failing confusingly at sign-in time.
 * Both are genuinely wired (correct provider config shape, real
 * @auth/core provider objects), just inactive without real secrets.
 *
 * Email uses a dev-mode sendVerificationRequest that logs the sign-in link
 * instead of emailing it. This is a real, working provider for local
 * development and testing, not a stub — but it does not send real email.
 * No email provider has been chosen yet (DECISION_LOG.md's "still open"
 * list); wiring one in is a follow-up to this function, not a rewrite of it.
 * Built as a plain EmailConfig object rather than through
 * providers/email.js's default export: that export is a deprecated
 * wrapper around providers/nodemailer.js, which imports the `nodemailer`
 * package at module load time even though a custom sendVerificationRequest
 * never calls its transport — pulling in a real SMTP dependency this
 * project doesn't need yet just to satisfy an unused code path.
 *
 * Enterprise SSO (SAML/OIDC federation) is explicitly out of scope for this
 * stage (Workstream 5's own instruction) — nothing here forecloses adding
 * it later as another entry in the providers array.
 */
export function createAuthConfig(options: AuthConfigOptions): AuthConfig {
  const logger = options.logger ?? createLogger({ service: "titan-auth" });

  const devEmailProvider: EmailConfig = {
    id: "email",
    type: "email",
    name: "Email",
    from: "no-reply@titan.local",
    async sendVerificationRequest({ identifier, url }) {
      logger.info("sign-in link generated (dev mode — not actually emailed)", {
        identifier,
        url,
      });
    },
  };

  const providers: AuthConfig["providers"] = [devEmailProvider];

  if (options.google) {
    providers.push(
      Google({ clientId: options.google.clientId, clientSecret: options.google.clientSecret }),
    );
  }
  if (options.github) {
    providers.push(
      GitHub({ clientId: options.github.clientId, clientSecret: options.github.clientSecret }),
    );
  }

  return {
    adapter: D1Adapter(options.db),
    providers,
    secret: options.secret,
    trustHost: options.trustHost ?? true,
    basePath: "/api/auth",
    session: { strategy: "database" },
    // Cookies: deliberately not overridden here. @auth/core's own defaults
    // (verified directly against its cookie.js, not assumed) are already
    // `httpOnly: true`, `sameSite: "lax"` on every cookie it sets, and
    // `secure` auto-detected from whether the request was made over HTTPS —
    // with the `__Secure-`/`__Host-` name prefixes applied automatically
    // once `secure` is on. There is no hardening left to add without a
    // concrete reason to diverge from a well-reviewed default.
  };
}

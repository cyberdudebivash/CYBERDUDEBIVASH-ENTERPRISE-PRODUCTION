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
  /**
   * EAP-1: the origin of the browser app that calls this Worker cross-origin
   * (`http/cors.ts`'s `resolveAllowedOrigin` — pass the same resolved value
   * so CORS and sign-in redirects never diverge). `@auth/core`'s *default*
   * `redirect` callback (verified directly against its source,
   * `lib/init.js`) only allows a `callbackUrl` that's relative or shares the
   * Worker's own origin — a cross-origin SPA's `callbackUrl` fails both
   * checks and silently collapses to the Worker's bare root instead of
   * returning the user to the app. Supplying this explicitly allows that one
   * additional, known origin without opening redirects to anywhere else.
   */
  allowedOrigin?: string;
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
    callbacks: {
      // @auth/core's own default session callback (lib/init.js) deliberately
      // strips `id` from `session.user`, keeping only name/email/image —
      // verified directly against its source, not assumed. Authorization
      // (auth/authorize.ts) needs the caller's user id to look up their
      // UserProfileRecord[], so it must be copied through explicitly.
      //
      // Mirrors the default callback's own construction (a fresh, minimal
      // object) rather than mutating and returning the `session` argument
      // as-is — confirmed by direct probing against a real adapter session
      // that for the database strategy, `session` here is `{...rawRow,
      // user}`, i.e. it also carries the raw `sessionToken` and `userId`
      // columns. Returning it wholesale would leak the session token itself
      // into GET /api/auth/session's JSON body — already present in an
      // httpOnly cookie, it has no business also appearing in a response a
      // page's own JS can read.
      async session({ session, user }) {
        return {
          user: {
            id: user.id,
            name: session.user?.name,
            email: session.user?.email,
            image: session.user?.image,
          },
          expires: session.expires?.toISOString?.() ?? session.expires,
        };
      },
      // Mirrors @auth/core's own default redirect callback (same two checks,
      // same fallback), plus one addition: a `callbackUrl` on `allowedOrigin`
      // is also allowed, not just one sharing the Worker's own origin. A
      // malformed `url` (invalid URL string) falls through to `baseUrl`
      // rather than throwing, same failure mode as an unrecognized origin.
      redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        try {
          const target = new URL(url).origin;
          if (target === baseUrl || (options.allowedOrigin && target === options.allowedOrigin)) {
            return url;
          }
        } catch {
          // Not a parseable absolute URL — fall through to baseUrl below.
        }
        return baseUrl;
      },
    },
  };
}

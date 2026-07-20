-- Auth.js core schema, verified against the real @auth/d1-adapter package
-- (v1.11.2's own migrations.ts, inspected directly — not guessed) so this
-- database is compatible with the adapter's actual queries.ts SQL out of
-- the box. Column names/casing/PKs match the adapter exactly; do not
-- "clean up" the camelCase columns, the adapter's queries reference them
-- literally.

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" text NOT NULL,
  "userId" text NOT NULL DEFAULT NULL,
  "type" text NOT NULL DEFAULT NULL,
  "provider" text NOT NULL DEFAULT NULL,
  "providerAccountId" text NOT NULL DEFAULT NULL,
  "refresh_token" text DEFAULT NULL,
  "access_token" text DEFAULT NULL,
  "expires_at" number DEFAULT NULL,
  "token_type" text DEFAULT NULL,
  "scope" text DEFAULT NULL,
  "id_token" text DEFAULT NULL,
  "session_state" text DEFAULT NULL,
  "oauth_token_secret" text DEFAULT NULL,
  "oauth_token" text DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" text NOT NULL DEFAULT NULL,
  "expires" datetime NOT NULL DEFAULT NULL,
  PRIMARY KEY (sessionToken)
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" text NOT NULL DEFAULT '',
  "name" text DEFAULT NULL,
  "email" text DEFAULT NULL,
  "emailVerified" datetime DEFAULT NULL,
  "image" text DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL DEFAULT NULL,
  "expires" datetime NOT NULL DEFAULT NULL,
  PRIMARY KEY (token)
);

-- Indexes beyond the adapter's own migration: safe additions (adapter never
-- creates or expects the absence of these), used by queries.ts's actual
-- lookups (GET_ACCOUNT_BY_PROVIDER_AND_PROVIDER_ACCOUNT_ID_SQL,
-- DELETE_SESSION_BY_USER_ID_SQL, GET_USER_BY_EMAIL_SQL).
CREATE INDEX IF NOT EXISTS idx_accounts_userId ON accounts ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider_account ON accounts ("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users ("email");

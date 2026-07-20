-- Local dev seed data (Workstream 1). Idempotent: INSERT OR IGNORE against
-- fixed ids, so re-running `npm run db:seed:local` after already seeding is
-- a no-op instead of a UNIQUE-constraint error.

INSERT OR IGNORE INTO organizations (id, name, slug, created_at)
VALUES ('org_seed_acme', 'Acme Fintech', 'acme-fintech', '2026-07-20T00:00:00.000Z');

INSERT OR IGNORE INTO users (id, name, email, "emailVerified", image)
VALUES ('user_seed_admin', 'Asha Rao', 'asha@acme.in', NULL, NULL);

INSERT OR IGNORE INTO user_profiles (id, user_id, organization_id, role, created_at)
VALUES ('profile_seed_admin', 'user_seed_admin', 'org_seed_acme', 'owner', '2026-07-20T00:00:00.000Z');

INSERT OR IGNORE INTO assessments (id, organization_id, created_by, framework, framework_version, answers_json, result_json, created_at)
VALUES (
  'assessment_seed_1',
  'org_seed_acme',
  'user_seed_admin',
  'dpdp',
  'v1',
  '{"has_dpo":false}',
  '{"score":33,"riskLevel":"medium","breakdown":{"critical":0,"high":1,"medium":1,"low":10,"total":2},"gaps":[],"scoredQuestionCount":12}',
  '2026-07-20T00:00:00.000Z'
);

INSERT OR IGNORE INTO leads (id, organization_id, assessment_id, name, email, company, answers_json, result_json, source, created_at)
VALUES (
  'lead_seed_1',
  'org_seed_acme',
  'assessment_seed_1',
  'Asha Rao',
  'asha@acme.in',
  'Acme Fintech',
  '{"has_dpo":false}',
  '{"score":33,"riskLevel":"medium","breakdown":{"critical":0,"high":1,"medium":1,"low":10,"total":2},"gaps":[],"scoredQuestionCount":12}',
  'dpdp-scan',
  '2026-07-20T00:00:00.000Z'
);

INSERT OR IGNORE INTO audit_events (id, actor_id, organization_id, action, entity_type, entity_id, metadata_json, created_at)
VALUES (
  'audit_seed_1',
  'user_seed_admin',
  'org_seed_acme',
  'lead.created',
  'lead',
  'lead_seed_1',
  '{"seed":true}',
  '2026-07-20T00:00:00.000Z'
);

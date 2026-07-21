-- EAP-2 (Lead Intelligence Platform): lifecycle fields for CRM-style lead
-- management, additive to the leads table 0005 created. Defaults chosen so
-- every lead captured by the existing public scan flow (POST /api/leads,
-- which never sets any of these) lands in a sane, real starting state
-- rather than NULL: 'new' status, 'medium' priority, unassigned, no tags.
--
-- assigned_to is a nullable FK to users(id) — assignment is always to a
-- real signed-in admin user, never a free-text name (Workstream 3's
-- "Ownership"/"Assignment"). tags is a JSON array (tags_json), not a
-- separate many-to-many table: the lead-tagging feature set this phase
-- needs (attach a small, freeform set of labels to a lead) doesn't justify
-- a join table yet — see DECISION_LOG.md's EAP-2 entry.
--
-- Deliberately NOT added here: notes, activity history. EAP-2 records both
-- as audit_events (0007) instead of a new table — a lead lifecycle change
-- or an internal note *is* an audit-worthy event (who did what, when), and
-- audit_events already has the right shape (actor_id, entity_type,
-- entity_id, action, metadata_json, created_at) plus the append-only
-- guarantee a note/activity trail should have anyway. See
-- DECISION_LOG.md's EAP-2 entry for the full reasoning.
ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN assigned_to TEXT REFERENCES users (id);
ALTER TABLE leads ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads (priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads (assigned_to);

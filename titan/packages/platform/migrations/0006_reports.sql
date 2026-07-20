-- Report generation stays client-side (jsPDF, pdfReport.ts — Stage 3
-- decision, unchanged) for the free scan. This table is the persistence
-- side of Stage 4's Workstream 8 (Reporting): a record that a report was
-- generated for an assessment, so history/re-download can exist without
-- storing the PDF bytes in D1. storage_key is nullable and points at an R2
-- object key once a Queue/R2 pipeline actually writes one (ARCHITECTURE.md's
-- Cloudflare R2 decision) — not built this stage; the column exists so the
-- next stage adds a producer, not a migration.
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments (id),
  format TEXT NOT NULL DEFAULT 'pdf',
  storage_key TEXT,
  generated_at TEXT NOT NULL,
  downloaded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON reports (assessment_id);

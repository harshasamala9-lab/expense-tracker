-- ===========================================================================
-- Migration 002: secure admin accounts, automation metadata, import audit
--
-- This migration upgrades a database created by the original schema. It is
-- idempotent and mirrors the additions in database/schema.sql. New databases
-- can run schema.sql directly.
--
-- Apply with:
--   psql "$DATABASE_URL" -f database/migrations/002_auth_automation.sql
-- or from the backend:
--   npm run db:migrate
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Users (authentication + role-based access control)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('admin', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users (LOWER(email));

-- ---------------------------------------------------------------------------
-- Automation import runs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(30) NOT NULL DEFAULT 'automation',
    file_name TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed')),
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Expense provenance and deduplication
-- ---------------------------------------------------------------------------

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual';

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS import_run_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'expenses_import_run_id_fkey'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_import_run_id_fkey
            FOREIGN KEY (import_run_id)
            REFERENCES import_runs (id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_expenses_source
    ON expenses (source);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_source_external
    ON expenses (source, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_import_runs_started
    ON import_runs (started_at DESC);

COMMIT;

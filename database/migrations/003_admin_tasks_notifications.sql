-- ===========================================================================
-- Migration 003: persistent admin tasks, notifications, activity and reminders
--
-- This migration is additive and idempotent. It never drops or rewrites
-- existing expense, user or import data.
--
-- Apply with:
--   psql "$DATABASE_URL" -f database/migrations/003_admin_tasks_notifications.sql
-- or from the backend:
--   npm run db:migrate
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Admin tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    -- Flexible application-level category. The API validates this against a
    -- known list, but the database does not lock future categories out.
    task_type VARCHAR(40) NOT NULL DEFAULT 'GENERAL',

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),

    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),

    source_type VARCHAR(40) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),

    -- Stable key supplied by the detection engine. The unique constraint is
    -- the final protection against duplicate tasks for a repeated event.
    idempotency_key VARCHAR(255) NOT NULL,

    assigned_to UUID REFERENCES users (id) ON DELETE SET NULL,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,

    due_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users (id) ON DELETE SET NULL,

    resolution_note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT admin_tasks_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status_created
    ON admin_tasks (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority
    ON admin_tasks (priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_type
    ON admin_tasks (task_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned
    ON admin_tasks (assigned_to, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_open
    ON admin_tasks (due_at)
    WHERE status IN ('PENDING', 'IN_PROGRESS') AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_source
    ON admin_tasks (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_created_at
    ON admin_tasks (created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Admin notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    task_id UUID REFERENCES admin_tasks (id) ON DELETE CASCADE,

    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    severity VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),

    -- Stable key for a single notification. The unique constraint prevents
    -- repeated reminders or event notifications from flooding an inbox.
    deduplication_key VARCHAR(255) NOT NULL,

    action_type VARCHAR(30) NOT NULL DEFAULT 'TASK',
    action_id UUID,

    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT admin_notifications_recipient_dedup_key
        UNIQUE (recipient_id, deduplication_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient_created
    ON admin_notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
    ON admin_notifications (recipient_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_task
    ON admin_notifications (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity
    ON admin_notifications (recipient_id, severity, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Task activity / audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL REFERENCES admin_tasks (id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users (id) ON DELETE SET NULL,

    action VARCHAR(40) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_created
    ON task_activity (task_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_task_activity_actor
    ON task_activity (actor_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Reminder history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL REFERENCES admin_tasks (id) ON DELETE CASCADE,
    reminder_type VARCHAR(30) NOT NULL,
    window_key VARCHAR(40) NOT NULL,

    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT task_reminders_task_type_window_key
        UNIQUE (task_id, reminder_type, window_key)
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_sent
    ON task_reminders (sent_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Durable automation event inbox
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS automation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    source VARCHAR(60) NOT NULL DEFAULT 'python-automation',

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processed', 'ignored', 'failed')),

    -- Only whitelisted, non-financial diagnostic fields are stored here.
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    task_id UUID REFERENCES admin_tasks (id) ON DELETE SET NULL,

    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT automation_events_event_id_key UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_events_pending
    ON automation_events (next_attempt_at, received_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_automation_events_type
    ON automation_events (event_type, received_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Documentation comments
-- ---------------------------------------------------------------------------

COMMENT ON TABLE admin_tasks IS
    'Persistent administrator tasks generated by business events or created manually.';
COMMENT ON COLUMN admin_tasks.idempotency_key IS
    'Stable event identifier. Unique constraint prevents duplicate task generation.';
COMMENT ON COLUMN admin_tasks.metadata IS
    'Safe diagnostic context; never stores credentials or raw financial records.';

COMMENT ON TABLE admin_notifications IS
    'Per-administrator notification inbox. Read state is independent of task state.';
COMMENT ON COLUMN admin_notifications.deduplication_key IS
    'Unique per recipient; prevents duplicate reminders and event notifications.';

COMMENT ON TABLE task_activity IS
    'Append-only audit trail for task lifecycle changes.';

COMMENT ON TABLE task_reminders IS
    'Reminder delivery history. Unique key prevents duplicate reminders per window.';

COMMENT ON TABLE automation_events IS
    'Durable inbox for Python automation events with retry and idempotency support.';

COMMIT;

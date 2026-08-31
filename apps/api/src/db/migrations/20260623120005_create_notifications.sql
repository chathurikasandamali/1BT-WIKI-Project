-- Migration: 008_create_notifications
-- Description: In-app notifications for approval workflow and comment/answer events

CREATE TYPE notification_reference_type AS ENUM (
    'article',
    'tech_talk',
    'comment',
    'like',
    'review'
);

CREATE TYPE notification_type AS ENUM (
    'success',
    'failure',
    'info'
);

CREATE TABLE notifications (
    id              UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID                       NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
    notification_title varchar(255) NOT NULL,
    notification_reference_type  notification_reference_type NOT NULL,
    reference_id    UUID                       NOT NULL,   -- polymorphic FK (article / tech_talk / comment id)
    notification_type notification_type NOT NULL,
    message         TEXT                       NOT NULL,
    is_read         BOOLEAN                    NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP,
    deleted_at          TIMESTAMP,                          -- soft delete
    created_at          TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_notifications_is_read      ON notifications (recipient_id, is_read)
    WHERE is_read = FALSE;                                  -- fast unread count queries
CREATE INDEX idx_notifications_reference    ON notifications (notification_reference_type, reference_id);

COMMENT ON TABLE  notifications              IS 'In-app notifications; reference_id is a polymorphic pointer resolved via notification_reference_type';
COMMENT ON COLUMN notifications.reference_id IS 'UUID of the related article, tech_talk, or comment row — not a hard FK due to polymorphism';
COMMENT ON COLUMN notifications.is_read     IS 'Flipped to TRUE when the recipient opens the notification';

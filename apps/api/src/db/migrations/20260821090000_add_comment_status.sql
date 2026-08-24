-- Migration: 20260821090000_add_comment_status
-- Description: Adds a moderation status to article comments so new comments
--              require Admin approval before becoming publicly visible.
--              Existing comments are backfilled to 'Approved' so nothing
--              already live disappears when this ships.

CREATE TYPE comment_status AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);

ALTER TABLE article_comments
    ADD COLUMN status      comment_status NOT NULL DEFAULT 'Pending',
    ADD COLUMN reviewed_by UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Backfill: comments that already existed before moderation was introduced
-- were already publicly visible, so treat them as already approved.
UPDATE article_comments SET status = 'Approved' WHERE deleted_at IS NULL;

CREATE INDEX idx_article_comments_status ON article_comments (status)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN article_comments.status      IS 'Moderation state; only Approved comments are publicly visible';
COMMENT ON COLUMN article_comments.reviewed_by IS 'Admin who approved/rejected the comment';
COMMENT ON COLUMN article_comments.reviewed_at IS 'Timestamp of the approve/reject decision';

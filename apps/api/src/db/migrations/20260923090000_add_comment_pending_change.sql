-- Migration: 20260923090000_add_comment_pending_change
-- Description: Lets the author of an Approved comment request an edit or a
--              deletion that must be moderated before it takes effect. The
--              comment keeps its Approved status and original body (so it stays
--              publicly visible) while the request sits in the moderation queue.

CREATE TYPE comment_pending_change AS ENUM (
    'Edit',
    'Delete'
);

ALTER TABLE article_comments
    ADD COLUMN pending_change comment_pending_change,
    ADD COLUMN pending_body   TEXT;

-- The moderation queue lists Pending comments plus Approved comments with a
-- pending change, so index the latter the same way status is indexed.
CREATE INDEX idx_article_comments_pending_change ON article_comments (pending_change)
    WHERE deleted_at IS NULL AND pending_change IS NOT NULL;

COMMENT ON COLUMN article_comments.pending_change IS 'Edit/Delete requested by the author on an Approved comment, awaiting moderation';
COMMENT ON COLUMN article_comments.pending_body   IS 'Proposed body for a pending Edit; applied on approval, discarded on rejection';

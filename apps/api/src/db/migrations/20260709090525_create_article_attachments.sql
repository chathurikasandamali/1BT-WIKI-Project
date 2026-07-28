-- Rollback: DROP TABLE IF EXISTS article_attachments;

CREATE TABLE IF NOT EXISTS article_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES neon_auth.user(id),
  file_name TEXT NOT NULL,
  b2_file_key TEXT NOT NULL UNIQUE,
  b2_file_id TEXT NOT NULL,
  b2_bucket_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_article_attachments_article_id ON article_attachments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_attachments_uploaded_by ON article_attachments(uploaded_by);

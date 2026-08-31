-- Rollback:
--   DROP TABLE IF EXISTS quiz_questions;
--   DROP TABLE IF EXISTS quizzes;
--   DROP TYPE IF EXISTS quiz_question_type;

CREATE TYPE quiz_question_type AS ENUM ('mcq', 'single_choice', 'multiple_choice');

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  config_snapshot JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type quiz_question_type NOT NULL,
  -- options is a jsonb array of option strings; correct_answer is a jsonb array of
  -- correct option indexes so multiple_choice questions can hold several answers
  options JSONB NOT NULL,
  correct_answer JSONB NOT NULL,
  explanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_quizzes_article_id ON quizzes(article_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_fallback ON quizzes(article_id, is_fallback);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

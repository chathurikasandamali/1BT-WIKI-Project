-- Migrate quizzes to denormalized JSONB questions (removes quiz_questions table).
-- Rollback:
--   CREATE TABLE quiz_questions (...); -- see 20260728120000_create_quizzes.sql
--   ALTER TABLE quizzes DROP COLUMN questions;

ALTER TABLE quizzes ADD COLUMN questions JSONB NOT NULL DEFAULT '[]';

DROP TABLE IF EXISTS quiz_questions;
DROP TYPE IF EXISTS quiz_question_type;

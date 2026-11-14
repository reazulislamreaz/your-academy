-- Exam timer, result metrics, progress autosave, and historical answer snapshots (DEC-035)

ALTER TABLE "practice_sets"
  ADD COLUMN IF NOT EXISTS "pass_mark_percent" DOUBLE PRECISION;

ALTER TABLE "practice_attempts"
  ADD COLUMN IF NOT EXISTS "elapsed_seconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "percent_score" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "passed" BOOLEAN;

CREATE INDEX IF NOT EXISTS "practice_attempts_user_id_submitted_at_idx"
  ON "practice_attempts"("user_id", "submitted_at" DESC);

ALTER TABLE "practice_attempt_answers"
  ADD COLUMN IF NOT EXISTS "answered_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "question_title_snapshot" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "question_content_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "explanation_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "options_snapshot" JSONB;

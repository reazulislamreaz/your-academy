-- Per-question exam/question date (admin upload + manual create).
-- exam_year remains denormalized for filters; backfilled from question_date when possible.

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "question_date" TIMESTAMPTZ(3);
ALTER TABLE "question_upload_batches" ADD COLUMN IF NOT EXISTS "question_date" TIMESTAMPTZ(3);
ALTER TABLE "question_import_rows" ADD COLUMN IF NOT EXISTS "question_date" TIMESTAMPTZ(3);

-- Backfill from 4-digit exam_year → Jan 1 UTC of that year.
UPDATE "questions"
SET "question_date" = make_timestamptz(("exam_year")::int, 1, 1, 0, 0, 0, 'UTC')
WHERE "question_date" IS NULL
  AND "exam_year" ~ '^[0-9]{4}$';

UPDATE "question_upload_batches"
SET "question_date" = make_timestamptz(("exam_year")::int, 1, 1, 0, 0, 0, 'UTC')
WHERE "question_date" IS NULL
  AND "exam_year" ~ '^[0-9]{4}$';

UPDATE "question_import_rows"
SET "question_date" = make_timestamptz(("exam_year")::int, 1, 1, 0, 0, 0, 'UTC')
WHERE "question_date" IS NULL
  AND "exam_year" ~ '^[0-9]{4}$';

-- Full calendar strings already stored in exam_year (e.g. 2023-03-18).
UPDATE "questions"
SET "question_date" = ("exam_year")::timestamptz
WHERE "question_date" IS NULL
  AND "exam_year" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}';

UPDATE "question_upload_batches"
SET "question_date" = ("exam_year")::timestamptz
WHERE "question_date" IS NULL
  AND "exam_year" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}';

CREATE INDEX IF NOT EXISTS "questions_status_question_date_id_idx"
  ON "questions"("status", "question_date" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "questions_question_date_status_idx"
  ON "questions"("question_date" DESC, "status");

CREATE INDEX IF NOT EXISTS "question_upload_batches_status_question_date_id_idx"
  ON "question_upload_batches"("status", "question_date" DESC, "id" DESC);

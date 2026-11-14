-- Excel serial, section titles, sheet preamble, exam year, multi-subcategory placements

ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "source_serial" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "exam_year" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "section_title" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "questions_exam_year_status_idx" ON "questions"("exam_year", "status");

ALTER TABLE "question_upload_batches"
  ADD COLUMN IF NOT EXISTS "sheet_preamble" TEXT,
  ADD COLUMN IF NOT EXISTS "exam_year" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "question_upload_batches_exam_year_idx" ON "question_upload_batches"("exam_year");

ALTER TABLE "question_import_rows"
  ADD COLUMN IF NOT EXISTS "serial" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "section_title" VARCHAR(500);

CREATE TABLE IF NOT EXISTS "question_upload_batch_placements" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "subcategory_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "question_upload_batch_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "question_upload_batch_placements_batch_id_subcategory_id_key"
  ON "question_upload_batch_placements"("batch_id", "subcategory_id");

CREATE INDEX IF NOT EXISTS "question_upload_batch_placements_subcategory_id_batch_id_idx"
  ON "question_upload_batch_placements"("subcategory_id", "batch_id");

CREATE INDEX IF NOT EXISTS "question_upload_batch_placements_category_id_batch_id_idx"
  ON "question_upload_batch_placements"("category_id", "batch_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_upload_batch_placements_batch_id_fkey'
  ) THEN
    ALTER TABLE "question_upload_batch_placements"
      ADD CONSTRAINT "question_upload_batch_placements_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "question_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_upload_batch_placements_category_id_fkey'
  ) THEN
    ALTER TABLE "question_upload_batch_placements"
      ADD CONSTRAINT "question_upload_batch_placements_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_upload_batch_placements_subcategory_id_fkey'
  ) THEN
    ALTER TABLE "question_upload_batch_placements"
      ADD CONSTRAINT "question_upload_batch_placements_subcategory_id_fkey"
      FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Topic Base (DEC-042): optional Level-3 child category on uploads/questions.
-- Category tree itself uses existing parentId (TOPIC depth up to 3 enforced in service).

ALTER TABLE "topic_questions"
  ADD COLUMN IF NOT EXISTS "child_category_id" UUID;

ALTER TABLE "topic_upload_batches"
  ADD COLUMN IF NOT EXISTS "child_category_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_questions_child_category_id_fkey'
  ) THEN
    ALTER TABLE "topic_questions"
      ADD CONSTRAINT "topic_questions_child_category_id_fkey"
      FOREIGN KEY ("child_category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_upload_batches_child_category_id_fkey'
  ) THEN
    ALTER TABLE "topic_upload_batches"
      ADD CONSTRAINT "topic_upload_batches_child_category_id_fkey"
      FOREIGN KEY ("child_category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "topic_questions_child_category_id_sort_order_id_idx"
  ON "topic_questions"("child_category_id", "sort_order", "id");

CREATE INDEX IF NOT EXISTS "topic_upload_batches_child_category_id_idx"
  ON "topic_upload_batches"("child_category_id");

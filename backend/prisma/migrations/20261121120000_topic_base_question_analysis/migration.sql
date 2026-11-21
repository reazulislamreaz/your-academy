-- Topic Base Question Analysis (DEC-042): TOPIC scope, iconKey, upload batches + questions.

-- AlterEnum
ALTER TYPE "CategoryScope" ADD VALUE IF NOT EXISTS 'TOPIC';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TopicContentKind" AS ENUM ('PRELIMINARY', 'WRITTEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "icon_key" VARCHAR(40);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topic_upload_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_sha256" VARCHAR(64) NOT NULL,
    "content_kind" "TopicContentKind" NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "status" "QuestionUploadStatus" NOT NULL DEFAULT 'COMPLETED',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" UUID NOT NULL,
    "imported_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topic_upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topic_questions" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "content_kind" "TopicContentKind" NOT NULL,
    "source_serial" VARCHAR(32),
    "question_text" TEXT NOT NULL,
    "exam_label" VARCHAR(240),
    "option_a" TEXT NOT NULL DEFAULT '',
    "option_b" TEXT NOT NULL DEFAULT '',
    "option_c" TEXT NOT NULL DEFAULT '',
    "option_d" TEXT NOT NULL DEFAULT '',
    "correct_key" VARCHAR(1),
    "correct_answer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "row_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topic_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "topic_upload_batches_batch_code_key" ON "topic_upload_batches"("batch_code");
CREATE INDEX IF NOT EXISTS "topic_upload_batches_status_created_at_idx" ON "topic_upload_batches"("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "topic_upload_batches_category_id_subcategory_id_idx" ON "topic_upload_batches"("category_id", "subcategory_id");
CREATE INDEX IF NOT EXISTS "topic_upload_batches_content_kind_subcategory_id_idx" ON "topic_upload_batches"("content_kind", "subcategory_id");
CREATE INDEX IF NOT EXISTS "topic_upload_batches_uploaded_by_id_created_at_idx" ON "topic_upload_batches"("uploaded_by_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "topic_questions_subcategory_id_sort_order_id_idx" ON "topic_questions"("subcategory_id", "sort_order", "id");
CREATE INDEX IF NOT EXISTS "topic_questions_category_id_subcategory_id_idx" ON "topic_questions"("category_id", "subcategory_id");
CREATE INDEX IF NOT EXISTS "topic_questions_content_kind_subcategory_id_idx" ON "topic_questions"("content_kind", "subcategory_id");
CREATE INDEX IF NOT EXISTS "topic_questions_batch_id_row_number_idx" ON "topic_questions"("batch_id", "row_number");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "topic_upload_batches" ADD CONSTRAINT "topic_upload_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "topic_upload_batches" ADD CONSTRAINT "topic_upload_batches_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "topic_upload_batches" ADD CONSTRAINT "topic_upload_batches_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "topic_questions" ADD CONSTRAINT "topic_questions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "topic_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "topic_questions" ADD CONSTRAINT "topic_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "topic_questions" ADD CONSTRAINT "topic_questions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

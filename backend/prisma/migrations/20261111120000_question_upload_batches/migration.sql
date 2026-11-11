-- CreateEnum
CREATE TYPE "QuestionUploadStatus" AS ENUM ('VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionImportRowStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED', 'SKIPPED');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "content_hash" VARCHAR(64),
ADD COLUMN "upload_batch_id" UUID;

-- CreateTable
CREATE TABLE "question_upload_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "file_sha256" VARCHAR(64) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "status" "QuestionUploadStatus" NOT NULL DEFAULT 'VALIDATED',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "subject_hint" VARCHAR(120),
    "exam_category_hint" VARCHAR(120),
    "duplicate_file_batch_id" UUID,
    "error_message" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "imported_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "question_upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_import_rows" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "QuestionImportRowStatus" NOT NULL,
    "content_hash" VARCHAR(64),
    "question_text" TEXT NOT NULL,
    "option_a" TEXT,
    "option_b" TEXT,
    "option_c" TEXT,
    "option_d" TEXT,
    "correct_answer" VARCHAR(1),
    "explanation" TEXT,
    "subject_name" VARCHAR(120),
    "topic_name" VARCHAR(120),
    "difficulty" VARCHAR(16),
    "exam_category" VARCHAR(120),
    "exam_year" VARCHAR(32),
    "source" VARCHAR(240),
    "error_message" VARCHAR(500),
    "existing_question_id" UUID,
    "created_question_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_upload_batches_batch_code_key" ON "question_upload_batches"("batch_code");

-- CreateIndex
CREATE INDEX "question_upload_batches_status_created_at_idx" ON "question_upload_batches"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "question_upload_batches_file_sha256_idx" ON "question_upload_batches"("file_sha256");

-- CreateIndex
CREATE INDEX "question_upload_batches_uploaded_by_id_created_at_idx" ON "question_upload_batches"("uploaded_by_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "question_import_rows_batch_id_row_number_key" ON "question_import_rows"("batch_id", "row_number");

-- CreateIndex
CREATE INDEX "question_import_rows_batch_id_status_idx" ON "question_import_rows"("batch_id", "status");

-- CreateIndex
CREATE INDEX "question_import_rows_content_hash_idx" ON "question_import_rows"("content_hash");

-- CreateIndex
CREATE INDEX "questions_content_hash_idx" ON "questions"("content_hash");

-- CreateIndex
CREATE INDEX "questions_upload_batch_id_idx" ON "questions"("upload_batch_id");

-- Partial unique: live questions cannot share the same normalized content hash.
CREATE UNIQUE INDEX "questions_content_hash_alive_uidx"
ON "questions"("content_hash")
WHERE "deleted_at" IS NULL AND "content_hash" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "question_upload_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_upload_batches" ADD CONSTRAINT "question_upload_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_import_rows" ADD CONSTRAINT "question_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "question_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_import_rows" ADD CONSTRAINT "question_import_rows_created_question_id_fkey" FOREIGN KEY ("created_question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

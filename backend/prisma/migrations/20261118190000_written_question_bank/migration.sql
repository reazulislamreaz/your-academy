-- DEC-040 Written Question Bank
CREATE TABLE "written_upload_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
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
    "topic_hint" VARCHAR(120),
    "exam_category_hint" VARCHAR(120),
    "sheet_preamble" TEXT,
    "exam_year" VARCHAR(16),
    "question_date" TIMESTAMPTZ(3),
    "duplicate_file_batch_id" UUID,
    "error_message" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "imported_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "written_upload_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "written_upload_batches_batch_code_key" ON "written_upload_batches"("batch_code");
CREATE INDEX "written_upload_batches_status_created_at_idx" ON "written_upload_batches"("status", "created_at" DESC);
CREATE INDEX "written_upload_batches_status_question_date_id_idx" ON "written_upload_batches"("status", "question_date" DESC, "id" DESC);
CREATE INDEX "written_upload_batches_file_sha256_idx" ON "written_upload_batches"("file_sha256");
CREATE INDEX "written_upload_batches_uploaded_by_id_created_at_idx" ON "written_upload_batches"("uploaded_by_id", "created_at" DESC);
CREATE INDEX "written_upload_batches_exam_year_idx" ON "written_upload_batches"("exam_year");

CREATE TABLE "written_questions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "model_answer" TEXT,
    "marks" DECIMAL(6,2),
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "exam_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_note" VARCHAR(240),
    "source_serial" VARCHAR(32),
    "exam_year" VARCHAR(16),
    "question_date" TIMESTAMPTZ(3),
    "section_title" VARCHAR(500),
    "content_hash" VARCHAR(64),
    "upload_batch_id" UUID,
    "created_by_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "written_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "written_questions_status_published_at_id_idx" ON "written_questions"("status", "published_at" DESC, "id" DESC);
CREATE INDEX "written_questions_status_created_at_id_idx" ON "written_questions"("status", "created_at" DESC, "id" DESC);
CREATE INDEX "written_questions_category_id_status_idx" ON "written_questions"("category_id", "status");
CREATE INDEX "written_questions_subcategory_id_status_idx" ON "written_questions"("subcategory_id", "status");
CREATE INDEX "written_questions_exam_year_status_idx" ON "written_questions"("exam_year", "status");
CREATE INDEX "written_questions_status_question_date_id_idx" ON "written_questions"("status", "question_date" DESC, "id" DESC);
CREATE INDEX "written_questions_question_date_status_idx" ON "written_questions"("question_date" DESC, "status");
CREATE INDEX "written_questions_exam_tags_idx" ON "written_questions" USING GIN ("exam_tags");
CREATE INDEX "written_questions_content_hash_idx" ON "written_questions"("content_hash");
CREATE INDEX "written_questions_upload_batch_id_idx" ON "written_questions"("upload_batch_id");

CREATE TABLE "written_upload_batch_placements" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "written_upload_batch_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "written_upload_batch_placements_batch_id_subcategory_id_key" ON "written_upload_batch_placements"("batch_id", "subcategory_id");
CREATE INDEX "written_upload_batch_placements_subcategory_id_batch_id_idx" ON "written_upload_batch_placements"("subcategory_id", "batch_id");
CREATE INDEX "written_upload_batch_placements_category_id_batch_id_idx" ON "written_upload_batch_placements"("category_id", "batch_id");

CREATE TABLE "written_import_rows" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "QuestionImportRowStatus" NOT NULL,
    "content_hash" VARCHAR(64),
    "serial" VARCHAR(32),
    "question_text" TEXT NOT NULL,
    "model_answer" TEXT,
    "marks" DECIMAL(6,2),
    "subject_name" VARCHAR(120),
    "topic_name" VARCHAR(120),
    "exam_category" VARCHAR(120),
    "exam_year" VARCHAR(32),
    "question_date" TIMESTAMPTZ(3),
    "source" VARCHAR(240),
    "section_title" VARCHAR(500),
    "error_message" VARCHAR(500),
    "existing_question_id" UUID,
    "created_question_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "written_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "written_import_rows_batch_id_row_number_key" ON "written_import_rows"("batch_id", "row_number");
CREATE INDEX "written_import_rows_batch_id_status_idx" ON "written_import_rows"("batch_id", "status");
CREATE INDEX "written_import_rows_content_hash_idx" ON "written_import_rows"("content_hash");

ALTER TABLE "written_upload_batches" ADD CONSTRAINT "written_upload_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "written_questions" ADD CONSTRAINT "written_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "written_questions" ADD CONSTRAINT "written_questions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "written_questions" ADD CONSTRAINT "written_questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "written_questions" ADD CONSTRAINT "written_questions_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "written_upload_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "written_upload_batch_placements" ADD CONSTRAINT "written_upload_batch_placements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "written_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "written_upload_batch_placements" ADD CONSTRAINT "written_upload_batch_placements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "written_upload_batch_placements" ADD CONSTRAINT "written_upload_batch_placements_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "written_import_rows" ADD CONSTRAINT "written_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "written_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "written_import_rows" ADD CONSTRAINT "written_import_rows_created_question_id_fkey" FOREIGN KEY ("created_question_id") REFERENCES "written_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

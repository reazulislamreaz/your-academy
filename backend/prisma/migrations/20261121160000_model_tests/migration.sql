-- Public guest Model Tests (parallel to guest exams; isolated tables).

CREATE TABLE "model_tests" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "exam_year" INTEGER,
    "total_questions" INTEGER NOT NULL,
    "duration_in_minutes" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "model_tests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "model_test_questions" (
    "id" UUID NOT NULL,
    "model_test_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" VARCHAR(1000) NOT NULL,
    "explanation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "model_test_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "model_test_attempts" (
    "id" UUID NOT NULL,
    "model_test_id" UUID NOT NULL,
    "user_name" VARCHAR(120) NOT NULL,
    "score" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "user_answers" JSONB NOT NULL,
    "elapsed_seconds" INTEGER,
    "timed_out" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_test_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "model_tests_slug_key" ON "model_tests"("slug");
CREATE INDEX "model_tests_is_published_created_at_idx" ON "model_tests"("is_published", "created_at" DESC);
CREATE INDEX "model_tests_exam_year_idx" ON "model_tests"("exam_year");
CREATE INDEX "model_test_questions_model_test_id_sort_order_idx" ON "model_test_questions"("model_test_id", "sort_order");
CREATE INDEX "model_test_attempts_model_test_id_submitted_at_idx" ON "model_test_attempts"("model_test_id", "submitted_at" DESC);

ALTER TABLE "model_tests" ADD CONSTRAINT "model_tests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "model_test_questions" ADD CONSTRAINT "model_test_questions_model_test_id_fkey" FOREIGN KEY ("model_test_id") REFERENCES "model_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "model_test_attempts" ADD CONSTRAINT "model_test_attempts_model_test_id_fkey" FOREIGN KEY ("model_test_id") REFERENCES "model_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

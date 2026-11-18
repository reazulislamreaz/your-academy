-- Public guest timed exams (DEC-039) — separate from Question bank / PracticeSet.

CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "total_questions" INTEGER NOT NULL,
    "duration_in_minutes" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_questions" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" VARCHAR(1000) NOT NULL,
    "explanation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "user_name" VARCHAR(120) NOT NULL,
    "score" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL,
    "user_answers" JSONB NOT NULL,
    "elapsed_seconds" INTEGER,
    "timed_out" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");
CREATE INDEX "exams_is_published_created_at_idx" ON "exams"("is_published", "created_at" DESC);
CREATE INDEX "exam_questions_exam_id_sort_order_idx" ON "exam_questions"("exam_id", "sort_order");
CREATE INDEX "exam_attempts_exam_id_submitted_at_idx" ON "exam_attempts"("exam_id", "submitted_at" DESC);

ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

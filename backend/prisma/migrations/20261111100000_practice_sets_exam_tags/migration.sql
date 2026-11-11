-- CreateEnum
CREATE TYPE "PracticeSetKind" AS ENUM ('DAILY_QUIZ', 'SUBJECT_QUIZ', 'TOPIC_QUIZ', 'MODEL_TEST', 'PREVIOUS_YEAR_SET');
CREATE TYPE "PracticeSetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PracticeAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "exam_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "questions" ADD COLUMN "source_note" VARCHAR(240);
CREATE INDEX "questions_exam_tags_idx" ON "questions" USING GIN ("exam_tags");

-- CreateTable
CREATE TABLE "practice_sets" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "kind" "PracticeSetKind" NOT NULL,
    "status" "PracticeSetStatus" NOT NULL DEFAULT 'DRAFT',
    "duration_seconds" INTEGER,
    "marks_per_correct" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "negative_mark_per_wrong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category_id" UUID,
    "subcategory_id" UUID,
    "exam_tag" VARCHAR(64),
    "is_daily" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "practice_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_set_items" (
    "id" UUID NOT NULL,
    "practice_set_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "practice_set_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "practice_set_id" UUID NOT NULL,
    "status" "PracticeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "correct_count" INTEGER,
    "wrong_count" INTEGER,
    "skipped_count" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_attempt_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option_id" UUID,
    "is_correct" BOOLEAN,

    CONSTRAINT "practice_attempt_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practice_sets_slug_key" ON "practice_sets"("slug");
CREATE INDEX "practice_sets_status_kind_published_at_idx" ON "practice_sets"("status", "kind", "published_at" DESC);
CREATE INDEX "practice_sets_exam_tag_status_idx" ON "practice_sets"("exam_tag", "status");
CREATE INDEX "practice_sets_category_id_status_idx" ON "practice_sets"("category_id", "status");
CREATE INDEX "practice_sets_is_daily_status_idx" ON "practice_sets"("is_daily", "status");

CREATE UNIQUE INDEX "practice_set_items_practice_set_id_question_id_key" ON "practice_set_items"("practice_set_id", "question_id");
CREATE INDEX "practice_set_items_practice_set_id_sort_order_idx" ON "practice_set_items"("practice_set_id", "sort_order");

CREATE INDEX "practice_attempts_user_id_created_at_idx" ON "practice_attempts"("user_id", "created_at" DESC);
CREATE INDEX "practice_attempts_practice_set_id_created_at_idx" ON "practice_attempts"("practice_set_id", "created_at" DESC);
CREATE INDEX "practice_attempts_user_id_status_idx" ON "practice_attempts"("user_id", "status");

CREATE UNIQUE INDEX "practice_attempt_answers_attempt_id_question_id_key" ON "practice_attempt_answers"("attempt_id", "question_id");
CREATE INDEX "practice_attempt_answers_attempt_id_idx" ON "practice_attempt_answers"("attempt_id");

ALTER TABLE "practice_sets" ADD CONSTRAINT "practice_sets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practice_sets" ADD CONSTRAINT "practice_sets_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practice_sets" ADD CONSTRAINT "practice_sets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "practice_set_items" ADD CONSTRAINT "practice_set_items_practice_set_id_fkey" FOREIGN KEY ("practice_set_id") REFERENCES "practice_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_set_items" ADD CONSTRAINT "practice_set_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_practice_set_id_fkey" FOREIGN KEY ("practice_set_id") REFERENCES "practice_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "practice_attempt_answers" ADD CONSTRAINT "practice_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_attempt_answers" ADD CONSTRAINT "practice_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_attempt_answers" ADD CONSTRAINT "practice_attempt_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

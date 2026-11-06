-- Exam papers, timed model-test attempts, practice attempt recording,
-- and written (CQ) questions.
-- Hand-written: no Postgres DATABASE_URL was reachable from this workspace,
-- so `prisma migrate dev` could not run. Validate with `npx prisma validate`
-- and apply with `prisma migrate deploy` against a real database.

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MCQ', 'WRITTEN');

-- CreateEnum
CREATE TYPE "ExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- AlterTable: written-question support on questions
ALTER TABLE "questions"
  ADD COLUMN "kind" "QuestionKind" NOT NULL DEFAULT 'MCQ',
  ADD COLUMN "model_answer" TEXT;

-- CreateTable
CREATE TABLE "exam_papers" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "exam_body" VARCHAR(80) NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_paper_questions" (
    "paper_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_paper_questions_pkey" PRIMARY KEY ("paper_id", "question_id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exam_paper_id" UUID NOT NULL,
    "status" "ExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "unanswered_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option_id" UUID,
    "is_correct" BOOLEAN NOT NULL,
    "exam_attempt_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_papers_slug_key" ON "exam_papers"("slug");

-- CreateIndex
CREATE INDEX "exam_papers_exam_body_is_published_idx" ON "exam_papers"("exam_body", "is_published");

-- CreateIndex
CREATE INDEX "exam_papers_is_published_published_at_idx" ON "exam_papers"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "exam_paper_questions_paper_id_sort_order_idx" ON "exam_paper_questions"("paper_id", "sort_order");

-- CreateIndex
CREATE INDEX "exam_attempts_user_id_created_at_idx" ON "exam_attempts"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "exam_attempts_exam_paper_id_idx" ON "exam_attempts"("exam_paper_id");

-- CreateIndex
CREATE INDEX "question_attempts_user_id_created_at_idx" ON "question_attempts"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "question_attempts_exam_attempt_id_idx" ON "question_attempts"("exam_attempt_id");

-- AddForeignKey
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_paper_questions" ADD CONSTRAINT "exam_paper_questions_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_paper_questions" ADD CONSTRAINT "exam_paper_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_paper_id_fkey" FOREIGN KEY ("exam_paper_id") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_exam_attempt_id_fkey" FOREIGN KEY ("exam_attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "LearningActivityType" AS ENUM (
  'LOGIN',
  'LOGOUT',
  'QUESTION_ATTEMPT',
  'PRACTICE_START',
  'PRACTICE_SUBMIT',
  'BOOKMARK_QUESTION',
  'BOOKMARK_DOCUMENT',
  'DOCUMENT_VIEW'
);

-- CreateTable
CREATE TABLE "learning_activity_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "LearningActivityType" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject_category_id" UUID,
    "topic_category_id" UUID,
    "question_id" UUID,
    "practice_set_id" UUID,
    "practice_attempt_id" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "learning_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_activity_events_user_id_occurred_at_idx" ON "learning_activity_events"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "learning_activity_events_type_occurred_at_idx" ON "learning_activity_events"("type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "learning_activity_events_subject_category_id_occurred_at_idx" ON "learning_activity_events"("subject_category_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "learning_activity_events_occurred_at_idx" ON "learning_activity_events"("occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "learning_activity_events" ADD CONSTRAINT "learning_activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

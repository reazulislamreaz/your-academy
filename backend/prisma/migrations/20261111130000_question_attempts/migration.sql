-- Learner practice attempts for personal performance analytics (DEC-022)

CREATE TABLE "question_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "question_attempts_user_id_created_at_idx" ON "question_attempts"("user_id", "created_at" DESC);
CREATE INDEX "question_attempts_user_id_category_id_idx" ON "question_attempts"("user_id", "category_id");
CREATE INDEX "question_attempts_user_id_question_id_created_at_idx" ON "question_attempts"("user_id", "question_id", "created_at" DESC);

ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

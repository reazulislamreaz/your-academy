-- Study prefs: onboarding interests + continue-learning pointer
ALTER TABLE "users"
  ADD COLUMN "preferred_category_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "last_question_id" UUID,
  ADD COLUMN "last_question_filter_qs" VARCHAR(512),
  ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(3);

ALTER TABLE "users"
  ADD CONSTRAINT "users_last_question_id_fkey"
  FOREIGN KEY ("last_question_id") REFERENCES "questions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

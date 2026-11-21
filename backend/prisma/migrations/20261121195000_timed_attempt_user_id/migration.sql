-- Link public Quiz / Model Test attempts to authenticated users (DEC-045).
ALTER TABLE "exam_attempts" ADD COLUMN "user_id" UUID;

ALTER TABLE "model_test_attempts" ADD COLUMN "user_id" UUID;

CREATE INDEX "exam_attempts_user_id_submitted_at_idx" ON "exam_attempts"("user_id", "submitted_at" DESC);

CREATE INDEX "model_test_attempts_user_id_submitted_at_idx" ON "model_test_attempts"("user_id", "submitted_at" DESC);

ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "model_test_attempts" ADD CONSTRAINT "model_test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

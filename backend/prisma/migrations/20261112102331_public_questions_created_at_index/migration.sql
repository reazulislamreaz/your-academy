-- CreateIndex
CREATE INDEX "questions_status_created_at_id_idx" ON "questions"("status", "created_at" DESC, "id" DESC);

-- PERF-9: deleting a question sets question_import_rows.created_question_id NULL (FK scan).
-- CONCURRENTLY: builds without blocking writes. It cannot run inside a transaction, so this
-- migration holds exactly one statement (Prisma sends it as a single simple query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "question_import_rows_created_question_id_idx" ON "question_import_rows"("created_question_id");

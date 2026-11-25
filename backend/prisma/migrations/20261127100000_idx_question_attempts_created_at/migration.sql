-- PERF-3: admin activity counts question attempts by created_at (no user filter).
-- CONCURRENTLY: builds without blocking writes. It cannot run inside a transaction, so this
-- migration holds exactly one statement (Prisma sends it as a single simple query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "question_attempts_created_at_idx" ON "question_attempts"("created_at" DESC);

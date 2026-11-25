-- PERF-3: admin activity counts submitted practice attempts by submitted_at.
-- CONCURRENTLY: builds without blocking writes. It cannot run inside a transaction, so this
-- migration holds exactly one statement (Prisma sends it as a single simple query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "practice_attempts_submitted_at_idx" ON "practice_attempts"("submitted_at" DESC);

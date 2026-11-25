-- PERF-3: online / DAU KPIs filter heartbeats by time without a status filter.
-- CONCURRENTLY: builds without blocking writes. It cannot run inside a transaction, so this
-- migration holds exactly one statement (Prisma sends it as a single simple query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "browsing_sessions_last_heartbeat_at_idx" ON "browsing_sessions"("last_heartbeat_at" DESC);

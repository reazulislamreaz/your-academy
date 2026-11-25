-- PERF-9: KPI 'first purchase per user' groups PURCHASE events by user.
-- CONCURRENTLY: builds without blocking writes. It cannot run inside a transaction, so this
-- migration holds exactly one statement (Prisma sends it as a single simple query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "subscription_events_action_user_id_created_at_idx" ON "subscription_events"("action", "user_id", "created_at");

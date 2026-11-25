-- DEC-067 — richer audit log (actor role, severity, user agent) + more learner activity types.
-- Expand-only: new enum, nullable / defaulted columns, indexes, enum values. Rollback: down.sql.

CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'REGISTER';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'PROFILE_UPDATE';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'MODEL_TEST_SUBMIT';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'QUIZ_SUBMIT';
ALTER TYPE "LearningActivityType" ADD VALUE IF NOT EXISTS 'SET_VIEW';

ALTER TABLE "audit_logs"
  ADD COLUMN "actor_role" VARCHAR(20),
  ADD COLUMN "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
  ADD COLUMN "user_agent" VARCHAR(400);

-- Existing rows: the actor's current role is the best available value.
UPDATE "audit_logs" a
SET "actor_role" = u."role"::text
FROM "users" u
WHERE a."actor_user_id" = u."id" AND a."actor_role" IS NULL;

CREATE INDEX "audit_logs_actor_role_created_at_idx" ON "audit_logs"("actor_role", "created_at" DESC);
CREATE INDEX "audit_logs_severity_created_at_idx" ON "audit_logs"("severity", "created_at" DESC);

-- Manual rollback for 20261126150000_audit_activity_upgrade (not run by Prisma).
-- Enum values added to "LearningActivityType" cannot be dropped in PostgreSQL; they are unused
-- by older app versions only if no rows use them. Deploy the older app first, then:
--   npx prisma migrate resolve --rolled-back 20261126150000_audit_activity_upgrade
BEGIN;
DROP INDEX IF EXISTS "audit_logs_severity_created_at_idx";
DROP INDEX IF EXISTS "audit_logs_actor_role_created_at_idx";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_agent";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "severity";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actor_role";
DROP TYPE IF EXISTS "AuditSeverity";
COMMIT;

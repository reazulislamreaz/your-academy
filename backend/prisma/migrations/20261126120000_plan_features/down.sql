-- Manual rollback for 20261126120000_plan_features (not run by Prisma).
-- Deploy an app version without plan features first, then:
--   npx prisma migrate resolve --rolled-back 20261126120000_plan_features
BEGIN;
DROP TABLE IF EXISTS "plan_features";
DROP TYPE IF EXISTS "PlanKey";
COMMIT;

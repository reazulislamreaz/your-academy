-- DEC-060: replace the Admin-only answer-gating subscription (DEC-051/052) with the
-- Free vs Paid system + SSLCommerz. Runs as ONE transaction: if any step (including the
-- final check that every active subscriber was carried over) fails, nothing changes.
BEGIN;

-- CreateEnum
CREATE TYPE "PackageDuration" AS ENUM ('MONTHLY', 'SIX_MONTHS', 'YEARLY');

-- CreateEnum
CREATE TYPE "ContentAccess" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'RISK', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionEventSource" AS ENUM ('MANUAL', 'PAYMENT', 'MIGRATION');

-- CreateEnum
CREATE TYPE "SubscriptionEventAction" AS ENUM ('GRANT', 'EXTEND', 'SET_END', 'DISABLE', 'ENABLE', 'PURCHASE', 'MIGRATED');

-- 1) Stage legacy data BEFORE dropping anything --------------------------------------

-- Users with a subscription that is still running (or starts later): keep their dates.
CREATE TEMP TABLE "_legacy_active" ON COMMIT DROP AS
SELECT us."user_id",
       MIN(us."starts_at") AS "starts_at",
       MAX(us."ends_at")   AS "ends_at"
FROM "user_subscriptions" us
WHERE us."status" = 'ACTIVE' AND us."ends_at" > NOW()
GROUP BY us."user_id";

-- Every legacy row (active, expired, canceled) is kept as history in the new event log.
CREATE TEMP TABLE "_legacy_history" ON COMMIT DROP AS
SELECT us."user_id", us."status"::text AS "status", us."starts_at", us."ends_at",
       us."canceled_at", us."created_at", sp."name" AS "plan_name"
FROM "user_subscriptions" us
JOIN "subscription_plans" sp ON sp."id" = us."plan_id";

-- 2) Drop the old system ----------------------------------------------------------------
DROP TABLE "payments";
DROP TABLE "user_subscriptions";
DROP TABLE "subscription_plans";
DROP TYPE "PaymentStatus";
DROP TYPE "SubscriptionStatus";

-- Free trials were already disabled in code; the columns go with the old system.
DROP INDEX IF EXISTS "users_trial_ends_at_idx";
ALTER TABLE "users" DROP COLUMN "trial_ends_at", DROP COLUMN "trial_started_at";

-- 3) New system ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "model_tests" ADD COLUMN     "access" "ContentAccess" NOT NULL DEFAULT 'FREE';

-- CreateTable (new shape: one row per user)
CREATE TABLE "user_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),
    "disabled_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_subscriptions_ends_at_idx" ON "user_subscriptions"("ends_at");

ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "site_settings" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'default',
    "paid_system_enabled" BOOLEAN NOT NULL DEFAULT false,
    "preli_free_set_count" INTEGER NOT NULL DEFAULT 10,
    "written_free_set_count" INTEGER NOT NULL DEFAULT 10,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_packages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "duration" "PackageDuration" NOT NULL,
    "price_bdt" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "source" "SubscriptionEventSource" NOT NULL,
    "action" "SubscriptionEventAction" NOT NULL,
    "package_id" UUID,
    "payment_order_id" UUID,
    "previous_ends_at" TIMESTAMPTZ(3),
    "new_ends_at" TIMESTAMPTZ(3),
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL,
    "tran_id" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "package_name" VARCHAR(120) NOT NULL,
    "duration" "PackageDuration" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "val_id" VARCHAR(100),
    "bank_tran_id" VARCHAR(100),
    "card_type" VARCHAR(80),
    "gateway_status" VARCHAR(40),
    "risk_level" INTEGER,
    "risk_title" VARCHAR(200),
    "failure_reason" VARCHAR(300),
    "validated_at" TIMESTAMPTZ(3),
    "applied_at" TIMESTAMPTZ(3),
    "last_checked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_logs" (
    "id" UUID NOT NULL,
    "payment_order_id" UUID,
    "tran_id" VARCHAR(64),
    "kind" VARCHAR(40) NOT NULL,
    "http_status" INTEGER,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateway_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_packages_is_active_deleted_at_sort_order_idx" ON "subscription_packages"("is_active", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "subscription_events_user_id_created_at_idx" ON "subscription_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_tran_id_key" ON "payment_orders"("tran_id");

-- CreateIndex
CREATE INDEX "payment_orders_user_id_created_at_idx" ON "payment_orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payment_orders_status_created_at_idx" ON "payment_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "payment_gateway_logs_tran_id_idx" ON "payment_gateway_logs"("tran_id");

-- CreateIndex
CREATE INDEX "payment_gateway_logs_created_at_idx" ON "payment_gateway_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "subscription_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "subscription_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "subscription_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_gateway_logs" ADD CONSTRAINT "payment_gateway_logs_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Settings row with the safe defaults (paid system OFF until an admin turns it on).
INSERT INTO "site_settings" ("id", "paid_system_enabled", "preli_free_set_count", "written_free_set_count", "updated_at")
VALUES ('default', false, 10, 10, NOW());

-- 4) Carry legacy data over ---------------------------------------------------------------
INSERT INTO "user_subscriptions" ("id", "user_id", "package_id", "starts_at", "ends_at", "created_at", "updated_at")
SELECT gen_random_uuid(), a."user_id", NULL, a."starts_at", a."ends_at", NOW(), NOW()
FROM "_legacy_active" a;

INSERT INTO "subscription_events" ("id", "user_id", "source", "action", "new_ends_at", "note", "created_at")
SELECT gen_random_uuid(), h."user_id", 'MIGRATION', 'MIGRATED', h."ends_at",
       LEFT(FORMAT('Legacy %s subscription (%s) %s → %s%s', h."plan_name", h."status",
                   TO_CHAR(h."starts_at", 'YYYY-MM-DD'), TO_CHAR(h."ends_at", 'YYYY-MM-DD'),
                   CASE WHEN h."canceled_at" IS NOT NULL
                        THEN ', canceled ' || TO_CHAR(h."canceled_at", 'YYYY-MM-DD') ELSE '' END), 500),
       h."created_at"
FROM "_legacy_history" h;

-- 5) Safety check: every user who had access still has it --------------------------------
DO $$
DECLARE expected INTEGER; carried INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected FROM "_legacy_active";
  SELECT COUNT(*) INTO carried
  FROM "user_subscriptions" s JOIN "_legacy_active" a
    ON a."user_id" = s."user_id" AND a."ends_at" = s."ends_at" AND a."starts_at" = s."starts_at";
  IF expected <> carried THEN
    RAISE EXCEPTION 'DEC-060 migration: % active legacy subscriptions but % carried over', expected, carried;
  END IF;
  RAISE NOTICE 'DEC-060 migration: carried over % active subscriptions', carried;
END $$;

COMMIT;

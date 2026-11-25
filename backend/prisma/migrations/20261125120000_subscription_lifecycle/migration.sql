-- DEC-062 — subscription lifecycle (cancel / scheduled downgrade / expiry reminders),
-- discounted price + Popular badge, and the 3-month plan length. Expand-only.

-- New enum values (PostgreSQL 12+ allows ADD VALUE here; they are first used by the next migration).
ALTER TYPE "PackageDuration" ADD VALUE IF NOT EXISTS 'THREE_MONTHS';
ALTER TYPE "SubscriptionEventAction" ADD VALUE IF NOT EXISTS 'CANCEL';
ALTER TYPE "SubscriptionEventAction" ADD VALUE IF NOT EXISTS 'RESUME';
ALTER TYPE "SubscriptionEventAction" ADD VALUE IF NOT EXISTS 'SCHEDULE_CHANGE';
ALTER TYPE "SubscriptionEventAction" ADD VALUE IF NOT EXISTS 'CLEAR_SCHEDULED_CHANGE';

ALTER TABLE "subscription_packages"
  ADD COLUMN "discounted_price_bdt" DECIMAL(12,2),
  ADD COLUMN "is_popular" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "user_subscriptions"
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceled_at" TIMESTAMPTZ(3),
  ADD COLUMN "reminder_3d_sent_at" TIMESTAMPTZ(3),
  ADD COLUMN "reminder_7d_sent_at" TIMESTAMPTZ(3),
  ADD COLUMN "scheduled_package_id" UUID;

ALTER TABLE "user_subscriptions"
  ADD CONSTRAINT "user_subscriptions_scheduled_package_id_fkey"
  FOREIGN KEY ("scheduled_package_id") REFERENCES "subscription_packages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

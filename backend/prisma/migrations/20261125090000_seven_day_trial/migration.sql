-- DEC-061: 7-day full-access trial. Ends 7 days after account creation, using DB server
-- time. Existing accounts are backfilled from their original sign-up date (owner decision).
ALTER TABLE "users" ADD COLUMN "trial_ends_at" TIMESTAMPTZ(3);
UPDATE "users" SET "trial_ends_at" = "created_at" + INTERVAL '7 days';
ALTER TABLE "users" ALTER COLUMN "trial_ends_at" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "trial_ends_at" SET DEFAULT (now() + '7 days'::interval);

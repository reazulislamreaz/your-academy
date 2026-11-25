-- Manual rollback for 20261126170000_three_paid_plans (not run by Prisma).
-- Removes the 6 Months / 1 Year packages this migration created, only if nobody has bought
-- them (orders / subscriptions / events). The 3 Months text change is not reverted (it was
-- placeholder test text). Then: npx prisma migrate resolve --rolled-back 20261126170000_three_paid_plans
BEGIN;
DELETE FROM "subscription_packages" p
WHERE ((p."name" = '6 Months' AND p."duration" = 'SIX_MONTHS' AND p."price_bdt" = 449)
    OR (p."name" = '1 Year' AND p."duration" = 'YEARLY' AND p."price_bdt" = 899))
  AND NOT EXISTS (SELECT 1 FROM "payment_orders" o WHERE o."package_id" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "user_subscriptions" s WHERE s."package_id" = p."id" OR s."scheduled_package_id" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "subscription_events" e WHERE e."package_id" = p."id");
COMMIT;

-- DEC-062 — "3 Months" replaces "Monthly" on the pricing page.
-- The live Monthly package(s) are hidden (kept: old orders reference them). One 3-month
-- package is created from the first one, at the same per-month rate (price x 3) — the admin
-- reviews the price / discount in Admin → Packages. Skipped when a 3-month package exists.

INSERT INTO "subscription_packages"
  ("id", "name", "duration", "price_bdt", "description", "features", "is_active", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), '3 Months', 'THREE_MONTHS', m."price_bdt" * 3, m."description", m."features",
       true, m."sort_order", now(), now()
FROM "subscription_packages" m
WHERE m."duration" = 'MONTHLY' AND m."is_active" AND m."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "subscription_packages" t
    WHERE t."duration" = 'THREE_MONTHS' AND t."deleted_at" IS NULL
  )
ORDER BY m."sort_order", m."created_at"
LIMIT 1;

UPDATE "subscription_packages"
SET "is_active" = false, "updated_at" = now()
WHERE "duration" = 'MONTHLY' AND "is_active" AND "deleted_at" IS NULL;

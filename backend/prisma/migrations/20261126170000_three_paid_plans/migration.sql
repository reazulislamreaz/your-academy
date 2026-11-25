-- Plan 1 (owner approval 2026-11-26) — three paid plans: 3 Months (existing), 6 Months ৳449,
-- 1 Year ৳899 (Recommended). Additive / idempotent: inserts only a missing duration, never
-- touches prices, IDs or subscriptions of existing packages. Rollback: down.sql.

-- 6 Months — only when no live 6-month package exists.
INSERT INTO "subscription_packages"
  ("id", "name", "duration", "price_bdt", "description", "features", "is_active", "is_popular", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), '6 Months', 'SIX_MONTHS', 449,
  'একটি পূর্ণ পরীক্ষা মৌসুমের জন্য — ৬ মাস সম্পূর্ণ অ্যাক্সেস।',
  ARRAY['৬ মাস সম্পূর্ণ অ্যাক্সেস', '৩ মাসের প্যাকেজের চেয়ে প্রতি মাসে কম খরচ'],
  true, false, 1, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "subscription_packages" WHERE "duration" = 'SIX_MONTHS' AND "deleted_at" IS NULL
);

-- 1 Year — only when no live yearly package exists.
INSERT INTO "subscription_packages"
  ("id", "name", "duration", "price_bdt", "description", "features", "is_active", "is_popular", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), '1 Year', 'YEARLY', 899,
  'সারা বছরের প্রস্তুতির জন্য সবচেয়ে সাশ্রয়ী — ১২ মাস সম্পূর্ণ অ্যাক্সেস।',
  ARRAY['১২ মাস সম্পূর্ণ অ্যাক্সেস', 'সবচেয়ে বেশি সাশ্রয়'],
  true, true, 2, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "subscription_packages" WHERE "duration" = 'YEARLY' AND "deleted_at" IS NULL
);

-- Exactly one Recommended: the (first) live yearly package; every other live package unmarked.
UPDATE "subscription_packages" p
SET "is_popular" = (p."id" = y."id"), "updated_at" = now()
FROM (
  SELECT "id" FROM "subscription_packages"
  WHERE "duration" = 'YEARLY' AND "deleted_at" IS NULL
  ORDER BY "sort_order", "created_at"
  LIMIT 1
) y
WHERE p."deleted_at" IS NULL AND p."is_popular" IS DISTINCT FROM (p."id" = y."id");

-- 3 Months: replace the placeholder test text — only while it is still exactly that text.
UPDATE "subscription_packages"
SET "description" = 'স্বল্প সময়ের প্রস্তুতির জন্য — ৩ মাস সব প্রশ্ন সেট, মডেল টেস্ট ও প্রিমিয়াম PDF।',
    "features" = ARRAY['৩ মাস সম্পূর্ণ অ্যাক্সেস', 'মেয়াদ শেষের আগে রিনিউ করলে বাকি দিন যোগ হবে'],
    "updated_at" = now()
WHERE "duration" = 'THREE_MONTHS'
  AND "description" = 'hjhngfbsdfgtrjhmghmbg b bg'
  AND "features" = ARRAY['cvfdbgfjytkukujtytyjyt'];

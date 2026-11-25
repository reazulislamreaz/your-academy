-- Homepage "Access & Pricing" Free vs Paid comparison rows (DEC-065). Display only — access is
-- still decided by AccessPolicyService. Additive: new enum + table, no existing data touched.
-- Rollback (manual — Prisma has no down migrations): see down.sql in this folder.

-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('FREE', 'PAID');

-- CreateTable
CREATE TABLE "plan_features" (
    "id" UUID NOT NULL,
    "plan_key" "PlanKey" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "is_included" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_features_plan_key_is_active_sort_order_idx" ON "plan_features"("plan_key", "is_active", "sort_order");

-- Starting list, derived from what AccessPolicyService enforces today (deploys do not run seed
-- scripts, so it lives here). {placeholders} are filled from live settings when served.
-- Only inserted into an empty table.
INSERT INTO "plan_features" ("id", "plan_key", "label", "is_included", "sort_order", "is_active", "updated_at")
SELECT gen_random_uuid(), v.plan_key::"PlanKey", v.label, v.is_included, v.sort_order, true, now()
FROM (VALUES
  ('FREE', 'First {preliFreeSets} Preli question sets', true, 0),
  ('FREE', 'First {writtenFreeSets} Written question sets', true, 1),
  ('FREE', 'Topic-Based questions free for {topicTrialDays} days after sign-up', true, 2),
  ('FREE', 'Free Model Tests', true, 3),
  ('FREE', 'Quizzes, daily quiz, practice sets and live exams', true, 4),
  ('FREE', 'Correct answers and explanations in every set you can open', true, 5),
  ('FREE', 'Newspaper columns and free PDFs', true, 6),
  ('FREE', 'Results history, bookmarks and dashboard', true, 7),
  ('FREE', 'All sets, paid Model Tests and premium PDFs', false, 8),
  ('PAID', 'Everything in Free', true, 0),
  ('PAID', 'Every Preli question set', true, 1),
  ('PAID', 'Every Written question set', true, 2),
  ('PAID', 'Unlimited Topic-Based questions', true, 3),
  ('PAID', 'All Model Tests, including paid ones', true, 4),
  ('PAID', 'Premium PDFs', true, 5)
) AS v(plan_key, label, is_included, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM "plan_features");

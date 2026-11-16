-- Attempt-scoped timer + mark-for-review (exam player redesign / DEC-035 extension)

ALTER TABLE "practice_attempts" ADD COLUMN "timer_seconds" INTEGER;

-- Backfill in-progress/historical attempts from set duration (null stays untimed).
UPDATE "practice_attempts" AS pa
SET "timer_seconds" = ps."duration_seconds"
FROM "practice_sets" AS ps
WHERE pa."practice_set_id" = ps."id"
  AND pa."timer_seconds" IS NULL
  AND ps."duration_seconds" IS NOT NULL;

ALTER TABLE "practice_attempt_answers" ADD COLUMN "marked_for_review" BOOLEAN NOT NULL DEFAULT false;

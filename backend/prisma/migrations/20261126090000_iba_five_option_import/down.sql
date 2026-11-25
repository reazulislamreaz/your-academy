-- Manual rollback for 20261126090000_iba_five_option_import (not run by Prisma).
-- Run only after deploying an app version that no longer reads these columns, then:
--   npx prisma migrate resolve --rolled-back 20261126090000_iba_five_option_import
-- IBA questions already imported keep their 5th option and `iba` tag (stored elsewhere).
BEGIN;
ALTER TABLE "question_import_rows" DROP COLUMN IF EXISTS "option_e";
ALTER TABLE "question_upload_batches" DROP COLUMN IF EXISTS "is_iba";
COMMIT;

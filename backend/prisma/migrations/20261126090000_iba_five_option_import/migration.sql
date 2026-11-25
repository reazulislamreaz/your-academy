-- IBA (5-option) Preli bulk upload. Expand-only: two new columns, existing rows untouched.
-- Questions themselves need no column: option E is a 5th `question_options` row (label 'E')
-- and IBA questions carry the `iba` exam tag (existing questions.exam_tags).
--
-- Rollback (manual — Prisma has no down migrations); see down.sql in this folder:
--   ALTER TABLE "question_import_rows" DROP COLUMN "option_e";
--   ALTER TABLE "question_upload_batches" DROP COLUMN "is_iba";

ALTER TABLE "question_upload_batches" ADD COLUMN "is_iba" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "question_import_rows" ADD COLUMN "option_e" TEXT;

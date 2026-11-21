-- Topic Base is fully separate from Preli/Written — drop content_kind coupling.

DROP INDEX IF EXISTS "topic_upload_batches_content_kind_subcategory_id_idx";
DROP INDEX IF EXISTS "topic_questions_content_kind_subcategory_id_idx";

ALTER TABLE "topic_questions" DROP COLUMN IF EXISTS "content_kind";
ALTER TABLE "topic_upload_batches" DROP COLUMN IF EXISTS "content_kind";

DROP TYPE IF EXISTS "TopicContentKind";

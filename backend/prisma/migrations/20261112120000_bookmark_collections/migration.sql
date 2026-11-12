-- Facebook-style MCQ save collections (DEC-026).
-- One bookmark row per user+question; optional collectionId (null = uncategorized).

CREATE TABLE "bookmark_collections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookmark_collections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookmark_collections_user_id_name_key" ON "bookmark_collections"("user_id", "name");

CREATE INDEX "bookmark_collections_user_id_created_at_idx" ON "bookmark_collections"("user_id", "created_at" DESC);

ALTER TABLE "bookmark_collections" ADD CONSTRAINT "bookmark_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_bookmarks" ADD COLUMN "collection_id" UUID;

CREATE INDEX "question_bookmarks_user_id_collection_id_created_at_idx" ON "question_bookmarks"("user_id", "collection_id", "created_at" DESC);

CREATE INDEX "question_bookmarks_collection_id_idx" ON "question_bookmarks"("collection_id");

ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "bookmark_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

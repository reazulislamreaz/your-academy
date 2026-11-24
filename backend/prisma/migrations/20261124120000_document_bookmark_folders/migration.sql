-- DEC-059: PDFs can be filed into the same private folders as saved MCQs.
-- Nullable column: every existing PDF bookmark stays saved, just not in a folder.
ALTER TABLE "document_bookmarks" ADD COLUMN "collection_id" UUID;

ALTER TABLE "document_bookmarks"
  ADD CONSTRAINT "document_bookmarks_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "bookmark_collections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "document_bookmarks_user_id_collection_id_created_at_idx"
  ON "document_bookmarks"("user_id", "collection_id", "created_at" DESC);

CREATE INDEX "document_bookmarks_collection_id_idx" ON "document_bookmarks"("collection_id");

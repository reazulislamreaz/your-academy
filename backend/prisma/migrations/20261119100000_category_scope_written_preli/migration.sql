-- DEC-041: Isolate Preliminary vs Written category taxonomies.

CREATE TYPE "CategoryScope" AS ENUM ('PRELIMINARY', 'WRITTEN');

ALTER TABLE "categories" ADD COLUMN "scope" "CategoryScope" NOT NULL DEFAULT 'PRELIMINARY';

DROP INDEX IF EXISTS "categories_slug_key";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_slug_key";

CREATE UNIQUE INDEX "categories_scope_slug_key" ON "categories"("scope", "slug");
CREATE INDEX "categories_scope_parent_id_idx" ON "categories"("scope", "parent_id");
CREATE INDEX "categories_scope_is_active_idx" ON "categories"("scope", "is_active");

-- Remap Written Question Bank FKs onto WRITTEN-scoped clones of any shared trees.
CREATE TEMP TABLE "_written_cat_map" (
  "old_id" UUID PRIMARY KEY,
  "new_id" UUID NOT NULL
);

-- Roots touched by written questions / placements
INSERT INTO "_written_cat_map" ("old_id", "new_id")
SELECT DISTINCT root.id, gen_random_uuid()
FROM "categories" root
WHERE root."parent_id" IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM "written_questions" w
      WHERE w."category_id" = root.id AND w."deleted_at" IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "written_questions" w
      JOIN "categories" sub ON sub.id = w."subcategory_id"
      WHERE sub."parent_id" = root.id AND w."deleted_at" IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "written_upload_batch_placements" p
      WHERE p."category_id" = root.id
    )
  );

-- Children of those roots (full Written mirror of the tree)
INSERT INTO "_written_cat_map" ("old_id", "new_id")
SELECT c.id, gen_random_uuid()
FROM "categories" c
WHERE c."parent_id" IN (SELECT "old_id" FROM "_written_cat_map")
ON CONFLICT DO NOTHING;

-- Insert WRITTEN clones (roots first, then children)
INSERT INTO "categories" (
  "id", "name", "slug", "description", "parent_id", "scope", "is_active", "sort_order", "created_at", "updated_at"
)
SELECT
  m."new_id",
  c."name",
  c."slug",
  c."description",
  NULL,
  'WRITTEN'::"CategoryScope",
  c."is_active",
  c."sort_order",
  NOW(),
  NOW()
FROM "_written_cat_map" m
JOIN "categories" c ON c.id = m."old_id"
WHERE c."parent_id" IS NULL;

INSERT INTO "categories" (
  "id", "name", "slug", "description", "parent_id", "scope", "is_active", "sort_order", "created_at", "updated_at"
)
SELECT
  m."new_id",
  c."name",
  c."slug",
  c."description",
  pm."new_id",
  'WRITTEN'::"CategoryScope",
  c."is_active",
  c."sort_order",
  NOW(),
  NOW()
FROM "_written_cat_map" m
JOIN "categories" c ON c.id = m."old_id"
JOIN "_written_cat_map" pm ON pm."old_id" = c."parent_id"
WHERE c."parent_id" IS NOT NULL;

UPDATE "written_questions" w
SET "category_id" = m."new_id"
FROM "_written_cat_map" m
WHERE w."category_id" = m."old_id";

UPDATE "written_questions" w
SET "subcategory_id" = m."new_id"
FROM "_written_cat_map" m
WHERE w."subcategory_id" = m."old_id";

UPDATE "written_upload_batch_placements" p
SET "category_id" = m."new_id"
FROM "_written_cat_map" m
WHERE p."category_id" = m."old_id";

UPDATE "written_upload_batch_placements" p
SET "subcategory_id" = m."new_id"
FROM "_written_cat_map" m
WHERE p."subcategory_id" = m."old_id";

DROP TABLE "_written_cat_map";

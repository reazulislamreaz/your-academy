-- Dedicated Model Test categories (isolated from bank taxonomy).

CREATE TABLE "model_test_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "model_test_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "model_test_categories_name_key" ON "model_test_categories"("name");
CREATE UNIQUE INDEX "model_test_categories_slug_key" ON "model_test_categories"("slug");

ALTER TABLE "model_tests" ADD COLUMN "category_id" UUID;

CREATE INDEX "model_tests_category_id_idx" ON "model_tests"("category_id");

ALTER TABLE "model_tests" ADD CONSTRAINT "model_tests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "model_test_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

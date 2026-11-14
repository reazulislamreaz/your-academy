-- CreateEnum
CREATE TYPE "HomepageContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "homepage_content" (
    "id" UUID NOT NULL,
    "status" "HomepageContentStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "hero_image_asset_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_content_status_key" ON "homepage_content"("status");

-- CreateIndex
CREATE INDEX "homepage_content_hero_image_asset_id_idx" ON "homepage_content"("hero_image_asset_id");

-- AddForeignKey
ALTER TABLE "homepage_content" ADD CONSTRAINT "homepage_content_hero_image_asset_id_fkey" FOREIGN KEY ("hero_image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_content" ADD CONSTRAINT "homepage_content_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

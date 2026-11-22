-- DEC-046: Admin-managed footer social media links

CREATE TYPE "SocialPlatform" AS ENUM (
  'FACEBOOK',
  'INSTAGRAM',
  'YOUTUBE',
  'LINKEDIN',
  'X',
  'WHATSAPP',
  'TELEGRAM',
  'TIKTOK'
);

CREATE TABLE "social_links" (
  "id" UUID NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "label" VARCHAR(80) NOT NULL DEFAULT '',
  "url" VARCHAR(500) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_links_platform_key" ON "social_links"("platform");

CREATE INDEX "social_links_enabled_sort_order_id_idx" ON "social_links"("enabled", "sort_order", "id");

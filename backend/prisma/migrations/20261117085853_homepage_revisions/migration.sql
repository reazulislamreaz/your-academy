-- CreateTable
CREATE TABLE "homepage_revisions" (
    "id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "hero_image_asset_id" UUID,
    "note" VARCHAR(200),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homepage_revisions_created_at_idx" ON "homepage_revisions"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "homepage_revisions" ADD CONSTRAINT "homepage_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

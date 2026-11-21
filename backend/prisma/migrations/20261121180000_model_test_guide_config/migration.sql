-- Singleton CMS for /model-test sidebar guide (DEC-043).
CREATE TABLE "model_test_guide_configs" (
    "id" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "items" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "model_test_guide_configs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "model_test_guide_configs"
  ADD CONSTRAINT "model_test_guide_configs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default Bangla title + steps (same copy previously hardcoded in the listing UI).
INSERT INTO "model_test_guide_configs" ("id", "title", "items", "updated_at", "updated_by_id")
VALUES (
  'default',
  'মডেল টেস্ট কীভাবে দিবেন',
  '[
    {"id":"mt-guide-1","text":"খুঁজুন / ফিল্টার করে একটি মডেল টেস্ট বেছে নিন।"},
    {"id":"mt-guide-2","text":"নাম দিয়ে শুরু — টাইমার চলবে।"},
    {"id":"mt-guide-3","text":"এক পৃষ্ঠায় ক–ঘ উত্তর মার্ক করুন।"},
    {"id":"mt-guide-4","text":"স্কিপ থাকলে সাবমিটের আগে নিশ্চিতকরণ আসবে।"},
    {"id":"mt-guide-5","text":"ফলাফলে স্কোর ও সঠিক/ভুল দেখুন।"}
  ]'::jsonb,
  CURRENT_TIMESTAMP,
  NULL
);

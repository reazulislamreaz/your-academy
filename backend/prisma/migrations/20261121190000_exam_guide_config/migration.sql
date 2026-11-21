-- Singleton CMS for /exams (Quiz) sidebar guide (DEC-044).
CREATE TABLE "exam_guide_configs" (
    "id" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "items" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "exam_guide_configs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "exam_guide_configs"
  ADD CONSTRAINT "exam_guide_configs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "exam_guide_configs" ("id", "title", "items", "updated_at", "updated_by_id")
VALUES (
  'default',
  'কুইজ কীভাবে দিবেন',
  '[
    {"id":"quiz-guide-1","text":"খুঁজুন / সার্চ করে একটি কুইজ বেছে নিন।"},
    {"id":"quiz-guide-2","text":"নাম দিয়ে শুরু — টাইমার চলবে।"},
    {"id":"quiz-guide-3","text":"এক পৃষ্ঠায় ক–ঘ উত্তর মার্ক করুন।"},
    {"id":"quiz-guide-4","text":"স্কিপ থাকলে সাবমিটের আগে নিশ্চিতকরণ আসবে।"},
    {"id":"quiz-guide-5","text":"ফলাফলে স্কোর ও সঠিক/ভুল দেখুন।"}
  ]'::jsonb,
  CURRENT_TIMESTAMP,
  NULL
);

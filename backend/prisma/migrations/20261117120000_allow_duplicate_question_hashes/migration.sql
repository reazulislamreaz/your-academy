-- Allow identical MCQs (same stem + answer) to coexist — bulk upload no longer
-- treats duplicates as blocked. Keep a non-unique index for optional lookup.
DROP INDEX IF EXISTS "questions_content_hash_alive_uidx";

-- Chronological message listing (DEC-029 / ordering fix): UUID id is not time-ordered.
DROP INDEX IF EXISTS "support_messages_conversation_id_id_idx";

CREATE INDEX IF NOT EXISTS "support_messages_conversation_id_created_at_id_idx"
  ON "support_messages"("conversation_id", "created_at" DESC, "id" DESC);

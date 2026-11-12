-- Support admin online presence queries (ACTIVE + lastHeartbeatAt window).
CREATE INDEX IF NOT EXISTS "browsing_sessions_status_last_heartbeat_at_idx"
  ON "browsing_sessions"("status", "last_heartbeat_at" DESC);

-- Support published document list orderBy updatedAt DESC, id DESC.
CREATE INDEX IF NOT EXISTS "documents_is_published_updated_at_id_idx"
  ON "documents"("is_published", "updated_at" DESC, "id" DESC);

-- Support audit filter by action + time.
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
  ON "audit_logs"("action", "created_at" DESC);

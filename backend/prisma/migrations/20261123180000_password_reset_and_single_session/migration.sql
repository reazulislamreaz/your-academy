-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "verifies_email" VARCHAR(255);

-- Single active session (one device per account): record why a session ended
-- so a replaced device can be told apart from a normal expiry.
ALTER TABLE "auth_sessions" ADD COLUMN     "revoked_reason" VARCHAR(32);

-- DropIndex
DROP INDEX "auth_sessions_user_id_idx";

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_created_at_idx" ON "auth_sessions"("user_id", "created_at" DESC);

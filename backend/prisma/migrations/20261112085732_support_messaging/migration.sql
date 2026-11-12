-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupportSenderType" AS ENUM ('USER', 'GUEST', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportMessageKind" AS ENUM ('TEXT', 'ATTACHMENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "support_guest_sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "whatsapp_number" VARCHAR(32) NOT NULL,
    "linked_user_id" UUID,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_conversations" (
    "id" UUID NOT NULL,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" VARCHAR(200),
    "user_id" UUID,
    "guest_session_id" UUID,
    "guest_name" VARCHAR(120),
    "guest_whatsapp" VARCHAR(32),
    "assigned_admin_id" UUID,
    "last_message_at" TIMESTAMPTZ(3),
    "last_message_preview" VARCHAR(280),
    "user_unread_count" INTEGER NOT NULL DEFAULT 0,
    "admin_unread_count" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_type" "SupportSenderType" NOT NULL,
    "sender_user_id" UUID,
    "client_message_id" VARCHAR(64),
    "kind" "SupportMessageKind" NOT NULL DEFAULT 'TEXT',
    "body" VARCHAR(8000),
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_internal_notes" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "author_admin_id" UUID NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_guest_sessions_token_hash_key" ON "support_guest_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "support_guest_sessions_whatsapp_number_idx" ON "support_guest_sessions"("whatsapp_number");

-- CreateIndex
CREATE INDEX "support_guest_sessions_linked_user_id_idx" ON "support_guest_sessions"("linked_user_id");

-- CreateIndex
CREATE INDEX "support_guest_sessions_expires_at_idx" ON "support_guest_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "support_conversations_status_last_message_at_idx" ON "support_conversations"("status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "support_conversations_user_id_status_idx" ON "support_conversations"("user_id", "status");

-- CreateIndex
CREATE INDEX "support_conversations_guest_session_id_idx" ON "support_conversations"("guest_session_id");

-- CreateIndex
CREATE INDEX "support_conversations_assigned_admin_id_idx" ON "support_conversations"("assigned_admin_id");

-- CreateIndex
CREATE INDEX "support_conversations_guest_whatsapp_idx" ON "support_conversations"("guest_whatsapp");

-- CreateIndex
CREATE INDEX "support_messages_conversation_id_id_idx" ON "support_messages"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "support_messages_sender_user_id_idx" ON "support_messages"("sender_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_messages_conversation_id_client_message_id_key" ON "support_messages"("conversation_id", "client_message_id");

-- CreateIndex
CREATE INDEX "support_attachments_message_id_idx" ON "support_attachments"("message_id");

-- CreateIndex
CREATE INDEX "support_attachments_media_asset_id_idx" ON "support_attachments"("media_asset_id");

-- CreateIndex
CREATE INDEX "support_internal_notes_conversation_id_created_at_idx" ON "support_internal_notes"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "support_internal_notes_author_admin_id_idx" ON "support_internal_notes"("author_admin_id");

-- AddForeignKey
ALTER TABLE "support_guest_sessions" ADD CONSTRAINT "support_guest_sessions_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "support_guest_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_author_admin_id_fkey" FOREIGN KEY ("author_admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

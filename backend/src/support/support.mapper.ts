import type {
  MediaAsset,
  SupportAttachment,
  SupportConversation,
  SupportMessage,
  User,
} from '@prisma/client';
import type { SupportConversationDto, SupportMessageDto } from './support.types';

type MessageWithAttachments = SupportMessage & {
  attachments: Array<SupportAttachment & { mediaAsset?: MediaAsset | null }>;
};

type ConversationWithUser = SupportConversation & {
  user?: (Pick<User, 'id' | 'name'> & { avatarAsset?: { publicId: string } | null }) | null;
};

export function mapMessage(
  message: MessageWithAttachments,
  downloadUrls: Map<string, string | null>,
): SupportMessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderUserId: message.senderUserId,
    clientMessageId: message.clientMessageId,
    kind: message.kind,
    body: message.body,
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    attachments: message.attachments.map((a) => ({
      id: a.id,
      mediaAssetId: a.mediaAssetId,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      bytes: a.bytes,
      downloadUrl: downloadUrls.get(a.mediaAssetId) ?? null,
    })),
  };
}

export function mapConversation(row: ConversationWithUser): SupportConversationDto {
  return {
    id: row.id,
    status: row.status,
    subject: row.subject,
    userId: row.userId,
    guestSessionId: row.guestSessionId,
    guestName: row.guestName,
    guestWhatsapp: row.guestWhatsapp,
    assignedAdminId: row.assignedAdminId,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: row.lastMessagePreview,
    userUnreadCount: row.userUnreadCount,
    adminUnreadCount: row.adminUnreadCount,
    closedAt: row.closedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    participantName: row.user?.name ?? row.guestName,
    participantAvatarUrl: null,
  };
}

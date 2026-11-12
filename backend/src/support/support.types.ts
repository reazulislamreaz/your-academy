import type { UserRole } from '@prisma/client';

export const SUPPORT_GUEST_COOKIE = 'support_guest_token';
export const SUPPORT_GUEST_TTL_DAYS = 30;
export const SUPPORT_MESSAGE_MAX_LEN = 8000;
export const SUPPORT_NOTE_MAX_LEN = 4000;

export type SupportActor =
  | { kind: 'user'; userId: string; role: UserRole; sessionId: string }
  | { kind: 'guest'; guestSessionId: string; name: string; whatsappNumber: string };

export type SupportMessageDto = {
  id: string;
  conversationId: string;
  senderType: string;
  senderUserId: string | null;
  clientMessageId: string | null;
  kind: string;
  body: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  attachments: Array<{
    id: string;
    mediaAssetId: string;
    originalFilename: string;
    mimeType: string;
    bytes: number;
    downloadUrl: string | null;
  }>;
};

export type SupportConversationDto = {
  id: string;
  status: string;
  subject: string | null;
  userId: string | null;
  guestSessionId: string | null;
  guestName: string | null;
  guestWhatsapp: string | null;
  assignedAdminId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  closedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participantName: string | null;
  participantAvatarUrl: string | null;
  participantOnline?: boolean;
  participantLastSeenAt?: string | null;
};

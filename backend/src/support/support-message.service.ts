import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SupportMessageKind,
  SupportSenderType,
  UserRole,
} from '@prisma/client';
import { createErrorResponse, cursorPaginationMeta } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SupportConversationService } from './support-conversation.service';
import { mapMessage } from './support.mapper';
import {
  SUPPORT_MESSAGE_MAX_LEN,
  SUPPORT_NOTE_MAX_LEN,
  type SupportActor,
  type SupportMessageDto,
} from './support.types';

@Injectable()
export class SupportMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: SupportConversationService,
    private readonly storage: StorageService,
  ) {}

  private sanitizeBody(body: string | undefined | null): string | null {
    if (body == null) return null;
    // Strip C0 controls except TAB/LF/CR without embedding control chars in a regex literal.
    const cleaned = [...body]
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || code > 31;
      })
      .join('')
      .trim();
    if (!cleaned) return null;
    return cleaned.slice(0, SUPPORT_MESSAGE_MAX_LEN);
  }

  /** Attachments may only reference assets the actor uploaded (prevents signed-URL IDOR). */
  private async requireOwnedAttachmentAsset(actor: SupportActor, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset || asset.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('ASSET_NOT_FOUND', 'Attachment asset not found', newRequestId()),
      );
    }

    const prefix = process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy';
    const owned =
      actor.kind === 'user'
        ? asset.uploadedById === actor.userId
        : asset.uploadedById == null &&
          asset.publicId.startsWith(`${prefix}/support-attachment/guest-${actor.guestSessionId}`);

    if (!owned) {
      throw new ForbiddenException(
        createErrorResponse(
          'ASSET_FORBIDDEN',
          'Attachment does not belong to this account',
          newRequestId(),
        ),
      );
    }

    return asset;
  }

  private async withDownloadUrls(
    messages: Array<{
      id: string;
      conversationId: string;
      senderType: SupportSenderType;
      senderUserId: string | null;
      clientMessageId: string | null;
      kind: SupportMessageKind;
      body: string | null;
      deliveredAt: Date | null;
      readAt: Date | null;
      createdAt: Date;
      attachments: Array<{
        id: string;
        mediaAssetId: string;
        originalFilename: string;
        mimeType: string;
        bytes: number;
        mediaAsset: {
          publicId: string;
          resourceType: string;
          deliveryType: string;
        };
      }>;
    }>,
  ): Promise<SupportMessageDto[]> {
    const unique = new Map<
      string,
      { publicId: string; resourceType: string; deliveryType: string }
    >();
    for (const m of messages) {
      for (const a of m.attachments) {
        if (!unique.has(a.mediaAssetId)) {
          unique.set(a.mediaAssetId, a.mediaAsset);
        }
      }
    }

    const urls = new Map<string, string | null>();
    await Promise.all(
      [...unique.entries()].map(async ([mediaAssetId, mediaAsset]) => {
        const resourceType = mediaAsset.resourceType === 'RAW' ? 'raw' : 'image';
        const url = await this.storage.generateSignedDownloadUrl(mediaAsset.publicId, {
          resourceType,
          deliveryType: mediaAsset.deliveryType as never,
          ttlSeconds: 300,
        });
        urls.set(mediaAssetId, url);
      }),
    );
    return messages.map((m) => mapMessage(m as never, urls));
  }

  async listMessages(actor: SupportActor, conversationId: string, cursor?: string, limitRaw?: number) {
    await this.conversations.requireAccessible(actor, conversationId);
    const limit = Math.min(Math.max(limitRaw ?? 30, 1), 100);
    const rows = await this.prisma.supportMessage.findMany({
      where: {
        conversationId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      include: {
        attachments: { include: { mediaAsset: true } },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await this.withDownloadUrls(page);
    items.reverse();
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
    return { items, meta: cursorPaginationMeta(nextCursor, limit, null) };
  }

  async sendMessage(
    actor: SupportActor,
    conversationId: string,
    input: { body?: string; clientMessageId?: string; mediaAssetId?: string; originalFilename?: string },
  ) {
    const conversation = await this.conversations.requireAccessible(actor, conversationId);
    if (conversation.status === 'CLOSED' || conversation.status === 'ARCHIVED') {
      throw new ForbiddenException(
        createErrorResponse('CONVERSATION_CLOSED', 'Conversation is closed', newRequestId()),
      );
    }

    const body = this.sanitizeBody(input.body);
    if (!body && !input.mediaAssetId) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', 'Message body or attachment required', newRequestId()),
      );
    }

    if (input.clientMessageId) {
      const existing = await this.prisma.supportMessage.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId,
            clientMessageId: input.clientMessageId,
          },
        },
        include: { attachments: { include: { mediaAsset: true } } },
      });
      if (existing) {
        const [dto] = await this.withDownloadUrls([existing]);
        return dto;
      }
    }

    const isAdmin = actor.kind === 'user' && actor.role === UserRole.ADMIN;
    const senderType = isAdmin
      ? SupportSenderType.ADMIN
      : actor.kind === 'guest'
        ? SupportSenderType.GUEST
        : SupportSenderType.USER;

    let ownedAsset: { id: string; mimeType: string; bytes: number } | null = null;
    if (input.mediaAssetId) {
      ownedAsset = await this.requireOwnedAttachmentAsset(actor, input.mediaAssetId);
    }

    const preview = body
      ? body.slice(0, 280)
      : input.originalFilename
        ? `Attachment: ${input.originalFilename}`
        : 'Attachment';

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          conversationId,
          senderType,
          senderUserId: actor.kind === 'user' ? actor.userId : null,
          clientMessageId: input.clientMessageId || null,
          kind: ownedAsset ? SupportMessageKind.ATTACHMENT : SupportMessageKind.TEXT,
          body,
          deliveredAt: new Date(),
          ...(ownedAsset
            ? {
                attachments: {
                  create: {
                    mediaAssetId: ownedAsset.id,
                    originalFilename: input.originalFilename ?? 'file',
                    mimeType: ownedAsset.mimeType,
                    bytes: ownedAsset.bytes,
                  },
                },
              }
            : {}),
        },
        include: { attachments: { include: { mediaAsset: true } } },
      });

      await tx.supportConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: preview,
          status: conversation.status === 'PENDING' ? 'OPEN' : conversation.status,
          ...(isAdmin
            ? { userUnreadCount: { increment: 1 } }
            : { adminUnreadCount: { increment: 1 } }),
        },
      });

      return created;
    });

    const [dto] = await this.withDownloadUrls([message]);
    return dto;
  }

  async markRead(actor: SupportActor, conversationId: string) {
    await this.conversations.requireAccessible(actor, conversationId);
    const isAdmin = actor.kind === 'user' && actor.role === UserRole.ADMIN;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (isAdmin) {
        await tx.supportMessage.updateMany({
          where: {
            conversationId,
            senderType: { in: [SupportSenderType.USER, SupportSenderType.GUEST] },
            readAt: null,
          },
          data: { readAt: now },
        });
        await tx.supportConversation.update({
          where: { id: conversationId },
          data: { adminUnreadCount: 0 },
        });
      } else {
        await tx.supportMessage.updateMany({
          where: {
            conversationId,
            senderType: SupportSenderType.ADMIN,
            readAt: null,
          },
          data: { readAt: now },
        });
        await tx.supportConversation.update({
          where: { id: conversationId },
          data: { userUnreadCount: 0 },
        });
      }
    });

    return { ok: true, readAt: now.toISOString() };
  }

  async listNotes(conversationId: string) {
    const notes = await this.prisma.supportInternalNote.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: { authorAdmin: { select: { id: true, name: true } } },
    });
    return notes.map((n) => ({
      id: n.id,
      conversationId: n.conversationId,
      authorAdminId: n.authorAdminId,
      authorName: n.authorAdmin.name,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async addNote(adminUserId: string, conversationId: string, body: string) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException(
        createErrorResponse('CONVERSATION_NOT_FOUND', 'Conversation not found', newRequestId()),
      );
    }
    const cleaned = this.sanitizeBody(body)?.slice(0, SUPPORT_NOTE_MAX_LEN);
    if (!cleaned) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', 'Note body required', newRequestId()),
      );
    }
    const note = await this.prisma.supportInternalNote.create({
      data: {
        conversationId,
        authorAdminId: adminUserId,
        body: cleaned,
      },
      include: { authorAdmin: { select: { id: true, name: true } } },
    });
    return {
      id: note.id,
      conversationId: note.conversationId,
      authorAdminId: note.authorAdminId,
      authorName: note.authorAdmin.name,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    };
  }
}

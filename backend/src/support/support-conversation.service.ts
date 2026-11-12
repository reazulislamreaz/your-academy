import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SupportConversationStatus,
  UserRole,
  type SupportConversation,
} from '@prisma/client';
import { createErrorResponse, cursorPaginationMeta } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { mapConversation } from './support.mapper';
import type { SupportActor } from './support.types';

const OPENISH: SupportConversationStatus[] = [
  SupportConversationStatus.OPEN,
  SupportConversationStatus.PENDING,
];

@Injectable()
export class SupportConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMine(actor: SupportActor) {
    if (actor.kind === 'user') {
      const existing = await this.prisma.supportConversation.findFirst({
        where: { userId: actor.userId, status: { in: OPENISH } },
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      });
      if (existing) return mapConversation(existing);
      const created = await this.prisma.supportConversation.create({
        data: {
          userId: actor.userId,
          status: SupportConversationStatus.OPEN,
          subject: 'Support',
        },
        include: { user: { select: { id: true, name: true } } },
      });
      return mapConversation(created);
    }

    const existing = await this.prisma.supportConversation.findFirst({
      where: { guestSessionId: actor.guestSessionId, status: { in: OPENISH } },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return mapConversation(existing);
    const created = await this.prisma.supportConversation.create({
      data: {
        guestSessionId: actor.guestSessionId,
        guestName: actor.name,
        guestWhatsapp: actor.whatsappNumber,
        status: SupportConversationStatus.OPEN,
        subject: 'Support',
      },
    });
    return mapConversation(created);
  }

  async getByIdForActor(actor: SupportActor, conversationId: string) {
    const row = await this.requireAccessible(actor, conversationId);
    return mapConversation(row);
  }

  async requireAccessible(actor: SupportActor, conversationId: string) {
    const row = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException(
        createErrorResponse('CONVERSATION_NOT_FOUND', 'Conversation not found', newRequestId()),
      );
    }
    if (actor.kind === 'user') {
      if (actor.role === UserRole.ADMIN) return row;
      if (row.userId !== actor.userId) {
        throw new ForbiddenException(
          createErrorResponse('FORBIDDEN', 'Not your conversation', newRequestId()),
        );
      }
      return row;
    }
    if (row.guestSessionId !== actor.guestSessionId) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Not your conversation', newRequestId()),
      );
    }
    return row;
  }

  async listAdmin(params: {
    q?: string;
    status?: SupportConversationStatus;
    filter?: 'all' | 'unread' | 'active' | 'archived';
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const filter = params.filter ?? 'all';
    const statusFilter =
      params.status ??
      (filter === 'active'
        ? undefined
        : filter === 'archived'
          ? SupportConversationStatus.ARCHIVED
          : undefined);

    const where = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filter === 'active'
        ? { status: { in: [SupportConversationStatus.OPEN, SupportConversationStatus.PENDING] } }
        : {}),
      ...(filter === 'unread' ? { adminUnreadCount: { gt: 0 } } : {}),
      ...(params.q
        ? {
            OR: [
              { guestName: { contains: params.q, mode: 'insensitive' as const } },
              { guestWhatsapp: { contains: params.q, mode: 'insensitive' as const } },
              { user: { name: { contains: params.q, mode: 'insensitive' as const } } },
              { user: { whatsappNumber: { contains: params.q, mode: 'insensitive' as const } } },
              { id: { equals: params.q } },
            ],
          }
        : {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };

    const rows = await this.prisma.supportConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { user: { select: { id: true, name: true } } },
    });
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(mapConversation);
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
    return {
      items,
      meta: cursorPaginationMeta(nextCursor, limit, null),
    };
  }

  async updateAdmin(
    conversationId: string,
    input: { status?: SupportConversationStatus; assignedAdminId?: string | null },
  ) {
    const existing = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('CONVERSATION_NOT_FOUND', 'Conversation not found', newRequestId()),
      );
    }

    if (input.assignedAdminId) {
      const admin = await this.prisma.user.findUnique({ where: { id: input.assignedAdminId } });
      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new UnprocessableEntityException(
          createErrorResponse('INVALID_ASSIGNEE', 'Assignee must be an admin', newRequestId()),
        );
      }
    }

    const data: Partial<SupportConversation> = {};
    if (input.status) {
      data.status = input.status;
      if (input.status === SupportConversationStatus.CLOSED) data.closedAt = new Date();
      if (input.status === SupportConversationStatus.ARCHIVED) {
        data.archivedAt = new Date();
        data.closedAt = existing.closedAt ?? new Date();
      }
      if (
        input.status === SupportConversationStatus.OPEN ||
        input.status === SupportConversationStatus.PENDING
      ) {
        data.closedAt = null;
        data.archivedAt = null;
      }
    }
    if (input.assignedAdminId !== undefined) {
      data.assignedAdminId = input.assignedAdminId;
    }

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data,
      include: { user: { select: { id: true, name: true } } },
    });
    return mapConversation(updated);
  }

  async unreadForActor(actor: SupportActor) {
    if (actor.kind === 'user') {
      if (actor.role === UserRole.ADMIN) {
        const agg = await this.prisma.supportConversation.aggregate({
          _sum: { adminUnreadCount: true },
          where: { status: { in: OPENISH } },
        });
        return { unread: agg._sum.adminUnreadCount ?? 0 };
      }
      const agg = await this.prisma.supportConversation.aggregate({
        _sum: { userUnreadCount: true },
        where: { userId: actor.userId, status: { in: OPENISH } },
      });
      return { unread: agg._sum.userUnreadCount ?? 0 };
    }
    const agg = await this.prisma.supportConversation.aggregate({
      _sum: { userUnreadCount: true },
      where: { guestSessionId: actor.guestSessionId, status: { in: OPENISH } },
    });
    return { unread: agg._sum.userUnreadCount ?? 0 };
  }
}

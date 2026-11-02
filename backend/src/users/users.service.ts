import { Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../subscriptions/access-control.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  async getMe(user: RequestUser) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser || dbUser.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    const access = await this.access.getAccessSnapshot(dbUser);
    return {
      id: dbUser.id,
      name: dbUser.name,
      whatsappNumber: dbUser.whatsappNumber,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      createdAt: dbUser.createdAt.toISOString(),
      access,
    };
  }

  async updateMe(user: RequestUser, data: { name?: string; email?: string | null }) {
    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined
          ? { email: data.email ? data.email.trim().toLowerCase() : null }
          : {}),
      },
    });
    const access = await this.access.getAccessSnapshot(updated);
    return {
      id: updated.id,
      name: updated.name,
      whatsappNumber: updated.whatsappNumber,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      access,
    };
  }

  async setAvatar(user: RequestUser, mediaAssetId: string) {
    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaAssetId,
        deletedAt: null,
        uploadedById: user.userId,
        resourceType: 'IMAGE',
      },
    });
    if (!media) {
      throw new NotFoundException(
        createErrorResponse('MEDIA_NOT_FOUND', 'Avatar media not found', newRequestId()),
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: { avatarAssetId: media.id },
    });
    return this.getMe({ userId: updated.id, role: updated.role, sessionId: user.sessionId });
  }

  async getStats(user: RequestUser) {
    const [questionBookmarks, documentBookmarks, browsing, recentQuestions, recentDocuments] =
      await Promise.all([
        this.prisma.questionBookmark.count({ where: { userId: user.userId } }),
        this.prisma.documentBookmark.count({ where: { userId: user.userId } }),
        this.prisma.browsingSession.aggregate({
          where: { userId: user.userId },
          _sum: { accruedSeconds: true },
        }),
        this.prisma.questionBookmark.findMany({
          where: { userId: user.userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            question: {
              select: { id: true, title: true, difficulty: true },
            },
          },
        }),
        this.prisma.documentBookmark.findMany({
          where: { userId: user.userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            document: {
              select: { id: true, title: true },
            },
          },
        }),
      ]);

    return {
      questionBookmarks,
      documentBookmarks,
      browsingSeconds: browsing._sum.accruedSeconds ?? 0,
      recentQuestions: recentQuestions.map((row) => ({
        bookmarkId: row.id,
        savedAt: row.createdAt.toISOString(),
        id: row.question.id,
        title: row.question.title,
        difficulty: row.question.difficulty,
      })),
      recentDocuments: recentDocuments.map((row) => ({
        bookmarkId: row.id,
        savedAt: row.createdAt.toISOString(),
        id: row.document.id,
        title: row.document.title,
      })),
    };
  }
}

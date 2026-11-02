import { Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { RequestUser } from '../auth/auth.types';

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

  async getStats(user: RequestUser) {
    const [questionBookmarks, documentBookmarks, browsing] = await Promise.all([
      this.prisma.questionBookmark.count({ where: { userId: user.userId } }),
      this.prisma.documentBookmark.count({ where: { userId: user.userId } }),
      this.prisma.browsingSession.aggregate({
        where: { userId: user.userId },
        _sum: { accruedSeconds: true },
      }),
    ]);

    return {
      questionBookmarks,
      documentBookmarks,
      browsingSeconds: browsing._sum.accruedSeconds ?? 0,
    };
  }
}

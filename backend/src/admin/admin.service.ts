import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionStatus, UserRole, UserStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const [
      totalUsers,
      activeUsers,
      trialActiveUsers,
      totalQuestions,
      publishedQuestions,
      draftQuestions,
      archivedQuestions,
      totalCategories,
      totalNews,
      totalDocuments,
      browsingAgg,
      recentUsers,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          trialStartedAt: { lte: now },
          trialEndsAt: { gt: now },
        },
      }),
      this.prisma.question.count({ where: { deletedAt: null } }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.PUBLISHED },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.DRAFT },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.ARCHIVED },
      }),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.news.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.browsingSession.aggregate({ _sum: { accruedSeconds: true } }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          whatsappNumber: true,
          createdAt: true,
          role: true,
          status: true,
        },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const trialExpiredUsers = await this.prisma.user.count({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        trialEndsAt: { lte: now },
        role: UserRole.USER,
      },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        trialActive: trialActiveUsers,
        trialExpired: trialExpiredUsers,
      },
      questions: {
        total: totalQuestions,
        published: publishedQuestions,
        draft: draftQuestions,
        archived: archivedQuestions,
      },
      categories: totalCategories,
      news: totalNews,
      documents: totalDocuments,
      browsingSecondsTotal: browsingAgg._sum.accruedSeconds ?? 0,
      recentUsers,
      recentActivity: recentActivity.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
        actor: row.actor
          ? { id: row.actor.id, name: row.actor.name, role: row.actor.role }
          : null,
      })),
    };
  }

  async listUsers(params: { q?: string; status?: UserStatus; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 100);
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: 'insensitive' } },
                { whatsappNumber: { contains: params.q } },
                { email: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialStartedAt: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    return user;
  }

  async updateUserStatus(id: string, status: UserStatus, actorUserId?: string) {
    if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
      throw new BadRequestException(
        createErrorResponse('VALIDATION_ERROR', 'Status must be ACTIVE or SUSPENDED', newRequestId()),
      );
    }
    const user = await this.getUser(id);
    if (user.role === UserRole.ADMIN && status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Cannot suspend admin accounts via this endpoint', newRequestId()),
      );
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: status === UserStatus.SUSPENDED ? 'USER_SUSPEND' : 'USER_REINSTATE',
        entityType: 'user',
        entityId: id,
        metadata: { status },
      },
    });

    return updated;
  }
}

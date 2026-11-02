import { Injectable } from '@nestjs/common';
import { QuestionStatus, UserStatus } from '@prisma/client';
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
      totalCategories,
      totalNews,
      totalDocuments,
      browsingAgg,
      recentUsers,
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
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.news.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.browsingSession.aggregate({ _sum: { accruedSeconds: true } }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, whatsappNumber: true, createdAt: true, role: true },
      }),
    ]);

    const trialExpiredUsers = await this.prisma.user.count({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        trialEndsAt: { lte: now },
        role: 'USER',
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
      },
      categories: totalCategories,
      news: totalNews,
      documents: totalDocuments,
      browsingSecondsTotal: browsingAgg._sum.accruedSeconds ?? 0,
      recentUsers,
    };
  }
}

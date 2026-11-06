import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { UpdateStudyPrefsDto } from './dto/update-study-prefs.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  private async serializeMe(userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        lastQuestion: {
          select: {
            id: true,
            title: true,
            deletedAt: true,
            status: true,
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!dbUser || dbUser.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    const access = await this.access.getAccessSnapshot(dbUser);
    const last =
      dbUser.lastQuestion &&
      !dbUser.lastQuestion.deletedAt &&
      dbUser.lastQuestion.status === QuestionStatus.PUBLISHED
        ? {
            id: dbUser.lastQuestion.id,
            title: dbUser.lastQuestion.title,
            categoryId: dbUser.lastQuestion.category.id,
            categoryName: dbUser.lastQuestion.subcategory
              ? `${dbUser.lastQuestion.category.name} · ${dbUser.lastQuestion.subcategory.name}`
              : dbUser.lastQuestion.category.name,
            filterQs: dbUser.lastQuestionFilterQs ?? undefined,
          }
        : null;

    return {
      id: dbUser.id,
      name: dbUser.name,
      whatsappNumber: dbUser.whatsappNumber,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      createdAt: dbUser.createdAt.toISOString(),
      access,
      study: {
        preferredCategoryIds: dbUser.preferredCategoryIds,
        onboardingCompleted: Boolean(dbUser.onboardingCompletedAt),
        onboardingCompletedAt: dbUser.onboardingCompletedAt?.toISOString() ?? null,
        lastQuestion: last,
      },
    };
  }

  async getMe(user: RequestUser) {
    return this.serializeMe(user.userId);
  }

  async updateMe(user: RequestUser, data: { name?: string; email?: string | null }) {
    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined
          ? { email: data.email ? data.email.trim().toLowerCase() : null }
          : {}),
      },
    });
    return this.getMe(user);
  }

  async updateStudyPrefs(user: RequestUser, dto: UpdateStudyPrefsDto) {
    const data: {
      preferredCategoryIds?: string[];
      lastQuestionId?: string | null;
      lastQuestionFilterQs?: string | null;
      onboardingCompletedAt?: Date | null;
    } = {};

    if (dto.preferredCategoryIds !== undefined) {
      const ids = [...new Set(dto.preferredCategoryIds)].slice(0, 3);
      if (ids.length > 0) {
        const roots = await this.prisma.category.findMany({
          where: { id: { in: ids }, parentId: null, isActive: true },
          select: { id: true },
        });
        if (roots.length !== ids.length) {
          throw new BadRequestException(
            createErrorResponse(
              'INVALID_CATEGORY',
              'preferredCategoryIds must be active root categories',
              newRequestId(),
            ),
          );
        }
      }
      data.preferredCategoryIds = ids;
    }

    if (dto.lastQuestionId !== undefined) {
      if (dto.lastQuestionId === null) {
        data.lastQuestionId = null;
        data.lastQuestionFilterQs = null;
      } else {
        const question = await this.prisma.question.findFirst({
          where: {
            id: dto.lastQuestionId,
            deletedAt: null,
            status: QuestionStatus.PUBLISHED,
          },
          select: { id: true },
        });
        if (!question) {
          throw new NotFoundException(
            createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
          );
        }
        data.lastQuestionId = question.id;
        if (dto.lastQuestionFilterQs !== undefined) {
          data.lastQuestionFilterQs = dto.lastQuestionFilterQs || null;
        }
      }
    } else if (dto.lastQuestionFilterQs !== undefined) {
      data.lastQuestionFilterQs = dto.lastQuestionFilterQs || null;
    }

    if (dto.onboardingCompleted === true) {
      data.onboardingCompletedAt = new Date();
    } else if (dto.onboardingCompleted === false) {
      data.onboardingCompletedAt = null;
    }

    await this.prisma.user.update({
      where: { id: user.userId },
      data,
    });
    return this.getMe(user);
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
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { avatarAssetId: media.id },
    });
    return this.getMe(user);
  }

  async getStats(user: RequestUser) {
    const [
      questionBookmarks,
      documentBookmarks,
      browsing,
      recentQuestions,
      recentDocuments,
      totalAttempted,
      totalCorrect,
      attemptRows,
    ] = await Promise.all([
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
      this.prisma.questionAttempt.count({ where: { userId: user.userId } }),
      this.prisma.questionAttempt.count({ where: { userId: user.userId, isCorrect: true } }),
      this.prisma.questionAttempt.findMany({
        where: { userId: user.userId },
        take: 5000,
        select: {
          isCorrect: true,
          question: {
            select: {
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const perCategoryMap = new Map<string, { categoryId: string; name: string; attempted: number; correct: number }>();
    for (const row of attemptRows) {
      const entry = perCategoryMap.get(row.question.categoryId) ?? {
        categoryId: row.question.categoryId,
        name: row.question.category.name,
        attempted: 0,
        correct: 0,
      };
      entry.attempted += 1;
      if (row.isCorrect) entry.correct += 1;
      perCategoryMap.set(row.question.categoryId, entry);
    }
    const perCategory = [...perCategoryMap.values()]
      .sort((a, b) => b.attempted - a.attempted)
      .slice(0, 6);

    return {
      questionBookmarks,
      documentBookmarks,
      browsingSeconds: browsing._sum.accruedSeconds ?? 0,
      totalAttempted,
      totalCorrect,
      accuracyPct: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
      perCategory,
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

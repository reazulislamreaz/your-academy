import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaResourceType, QuestionStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { UpdateStudyPrefsDto } from './dto/update-study-prefs.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly storage: StorageService,
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
        avatarAsset: {
          select: {
            id: true,
            publicId: true,
            resourceType: true,
            deliveryType: true,
            deletedAt: true,
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

    let avatarUrl: string | null = null;
    const avatar = dbUser.avatarAsset;
    if (avatar && !avatar.deletedAt) {
      avatarUrl = await this.storage.generateSignedDownloadUrl(avatar.publicId, {
        resourceType: avatar.resourceType === MediaResourceType.RAW ? 'raw' : 'image',
        deliveryType: avatar.deliveryType,
        ttlSeconds: 3600,
      });
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      whatsappNumber: dbUser.whatsappNumber,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      createdAt: dbUser.createdAt.toISOString(),
      avatarUrl,
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
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);

    const [
      questionBookmarks,
      documentBookmarks,
      browsing,
      recentQuestions,
      recentDocuments,
      attemptAgg,
      uniqueQuestions,
      weekAgg,
      recentAttempts,
      byCategoryRaw,
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
      this.prisma.questionAttempt.groupBy({
        by: ['isCorrect'],
        where: { userId: user.userId },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "question_id")::bigint AS count
        FROM "question_attempts"
        WHERE "user_id" = ${user.userId}::uuid
      `,
      this.prisma.questionAttempt.groupBy({
        by: ['isCorrect'],
        where: { userId: user.userId, createdAt: { gte: weekStart } },
        _count: { _all: true },
      }),
      this.prisma.questionAttempt.findMany({
        where: { userId: user.userId },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          isCorrect: true,
          createdAt: true,
          question: { select: { id: true, title: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.questionAttempt.groupBy({
        by: ['categoryId', 'isCorrect'],
        where: { userId: user.userId },
        _count: { _all: true },
      }),
    ]);

    const correct =
      attemptAgg.find((row) => row.isCorrect === true)?._count._all ?? 0;
    const incorrect =
      attemptAgg.find((row) => row.isCorrect === false)?._count._all ?? 0;
    const totalAttempts = correct + incorrect;
    const weekCorrect =
      weekAgg.find((row) => row.isCorrect === true)?._count._all ?? 0;
    const weekIncorrect =
      weekAgg.find((row) => row.isCorrect === false)?._count._all ?? 0;
    const weekAttempts = weekCorrect + weekIncorrect;

    const categoryIds = [...new Set(byCategoryRaw.map((row) => row.categoryId))];
    const categories =
      categoryIds.length === 0
        ? []
        : await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          });
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    const byCategoryMap = new Map<
      string,
      { categoryId: string; name: string; attempts: number; correct: number }
    >();
    for (const row of byCategoryRaw) {
      const current = byCategoryMap.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        name: categoryName.get(row.categoryId) ?? 'Unknown',
        attempts: 0,
        correct: 0,
      };
      current.attempts += row._count._all;
      if (row.isCorrect) current.correct += row._count._all;
      byCategoryMap.set(row.categoryId, current);
    }

    const byCategory = [...byCategoryMap.values()]
      .map((row) => ({
        ...row,
        accuracyPercent:
          row.attempts === 0 ? 0 : Math.round((row.correct / row.attempts) * 1000) / 10,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);

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
      performance: {
        totalAttempts,
        uniqueQuestions: Number(uniqueQuestions[0]?.count ?? 0),
        correct,
        incorrect,
        accuracyPercent:
          totalAttempts === 0 ? 0 : Math.round((correct / totalAttempts) * 1000) / 10,
        weekAttempts,
        weekCorrect,
        weekAccuracyPercent:
          weekAttempts === 0 ? 0 : Math.round((weekCorrect / weekAttempts) * 1000) / 10,
        byCategory,
        recentAttempts: recentAttempts.map((row) => ({
          id: row.id,
          questionId: row.question.id,
          title: row.question.title,
          isCorrect: row.isCorrect,
          categoryName: row.category.name,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    };
  }
}

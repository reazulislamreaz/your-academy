import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PracticeAttemptStatus,
  PracticeSetKind,
  PracticeSetStatus,
  Prisma,
  QuestionStatus,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { CreatePracticeSetDto, SubmitAttemptDto } from './dto/submit-attempt.dto';

const KIND_VALUES = new Set<string>(Object.values(PracticeSetKind));

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async listPublished(params: {
    kind?: string;
    examTag?: string;
    categoryId?: string;
    subcategoryId?: string;
    isDaily?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const kind = this.parseKind(params.kind);
    const where: Prisma.PracticeSetWhereInput = {
      status: PracticeSetStatus.PUBLISHED,
      ...(kind ? { kind } : {}),
      ...(params.examTag ? { examTag: params.examTag } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
      ...(params.isDaily !== undefined ? { isDaily: params.isDaily } : {}),
    };

    const items = await this.prisma.practiceSet.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        kind: true,
        durationSeconds: true,
        marksPerCorrect: true,
        negativeMarkPerWrong: true,
        examTag: true,
        isDaily: true,
        publishedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        _count: { select: { items: true } },
      },
    });

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map(({ _count, ...rest }) => ({
        ...rest,
        questionCount: _count.items,
      })),
      nextCursor,
    };
  }

  async getPublishedDetail(user: RequestUser, idOrSlug: string) {
    const set = await this.findPublishedSet(idOrSlug);
    const items = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: set.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            content: true,
            difficulty: true,
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, content: true, sortOrder: true },
            },
          },
        },
      },
    });

    return {
      id: set.id,
      title: set.title,
      slug: set.slug,
      description: set.description,
      kind: set.kind,
      durationSeconds: set.durationSeconds,
      marksPerCorrect: set.marksPerCorrect,
      negativeMarkPerWrong: set.negativeMarkPerWrong,
      examTag: set.examTag,
      isDaily: set.isDaily,
      publishedAt: set.publishedAt,
      category: set.category,
      subcategory: set.subcategory,
      questionCount: items.length,
      questions: items.map((item) => ({
        sortOrder: item.sortOrder,
        ...item.question,
      })),
      activeAttempt: await this.findActiveAttempt(user.userId, set.id),
    };
  }

  async startAttempt(user: RequestUser, idOrSlug: string) {
    const set = await this.findPublishedSet(idOrSlug);
    const existing = await this.findActiveAttempt(user.userId, set.id);
    if (existing) return existing;

    const itemCount = await this.prisma.practiceSetItem.count({
      where: { practiceSetId: set.id },
    });
    if (itemCount < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'This practice set has no questions',
          newRequestId(),
        ),
      );
    }

    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        userId: user.userId,
        practiceSetId: set.id,
        status: PracticeAttemptStatus.IN_PROGRESS,
        maxScore: itemCount * set.marksPerCorrect,
      },
      select: {
        id: true,
        practiceSetId: true,
        status: true,
        startedAt: true,
        maxScore: true,
      },
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'PRACTICE_START',
      subjectCategoryId: set.categoryId,
      topicCategoryId: set.subcategoryId,
      practiceSetId: set.id,
      practiceAttemptId: attempt.id,
    });

    return {
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      durationSeconds: set.durationSeconds,
      expiresAt:
        set.durationSeconds != null
          ? new Date(attempt.startedAt.getTime() + set.durationSeconds * 1000).toISOString()
          : null,
    };
  }

  async submitAttempt(user: RequestUser, attemptId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: {
        practiceSet: true,
        answers: true,
      },
    });
    if (!attempt || attempt.userId !== user.userId) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        createErrorResponse('ATTEMPT_ALREADY_SUBMITTED', 'Attempt already submitted', newRequestId()),
      );
    }

    const set = attempt.practiceSet;
    const timedOut =
      set.durationSeconds != null &&
      Date.now() > attempt.startedAt.getTime() + set.durationSeconds * 1000;

    const items = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: set.id },
      include: {
        question: {
          include: {
            options: { select: { id: true, isCorrect: true } },
          },
        },
      },
    });

    const answerByQuestion = new Map(
      dto.answers.map((a) => [a.questionId, a.selectedOptionId ?? null]),
    );

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let score = 0;
    const answerRows: {
      questionId: string;
      selectedOptionId: string | null;
      isCorrect: boolean | null;
    }[] = [];

    for (const item of items) {
      const selectedOptionId = answerByQuestion.get(item.questionId) ?? null;
      if (!selectedOptionId) {
        skippedCount += 1;
        answerRows.push({ questionId: item.questionId, selectedOptionId: null, isCorrect: null });
        continue;
      }
      const option = item.question.options.find((o) => o.id === selectedOptionId);
      if (!option) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_OPTION',
            'Selected option does not belong to this question',
            newRequestId(),
          ),
        );
      }
      if (option.isCorrect) {
        correctCount += 1;
        score += set.marksPerCorrect;
        answerRows.push({ questionId: item.questionId, selectedOptionId, isCorrect: true });
      } else {
        wrongCount += 1;
        score -= set.negativeMarkPerWrong;
        answerRows.push({ questionId: item.questionId, selectedOptionId, isCorrect: false });
      }
    }

    const maxScore = items.length * set.marksPerCorrect;
    const status = timedOut ? PracticeAttemptStatus.EXPIRED : PracticeAttemptStatus.SUBMITTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.practiceAttemptAnswer.deleteMany({ where: { attemptId } });
      await tx.practiceAttemptAnswer.createMany({
        data: answerRows.map((row) => ({
          attemptId,
          questionId: row.questionId,
          selectedOptionId: row.selectedOptionId,
          isCorrect: row.isCorrect,
        })),
      });
      return tx.practiceAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          submittedAt: new Date(),
          score,
          maxScore,
          correctCount,
          wrongCount,
          skippedCount,
        },
      });
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'PRACTICE_SUBMIT',
      subjectCategoryId: set.categoryId,
      topicCategoryId: set.subcategoryId,
      practiceSetId: set.id,
      practiceAttemptId: updated.id,
      meta: {
        status,
        correctCount,
        wrongCount,
        skippedCount,
        score,
      },
    });

    return this.getAttemptResult(user, updated.id);
  }

  async getAttemptResult(user: RequestUser, attemptId: string) {
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: {
        practiceSet: {
          select: {
            id: true,
            title: true,
            slug: true,
            kind: true,
            durationSeconds: true,
            marksPerCorrect: true,
            negativeMarkPerWrong: true,
            examTag: true,
          },
        },
        answers: true,
      },
    });
    if (!attempt || attempt.userId !== user.userId) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const canView = await this.access.canViewAnswers(dbUser);

    const items = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: attempt.practiceSetId },
      orderBy: { sortOrder: 'asc' },
      include: {
        question: {
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const review = items.map((item) => {
      const answer = answerMap.get(item.questionId);
      const options = item.question.options.map((o) =>
        this.access.stripAnswerFields(
          {
            id: o.id,
            label: o.label,
            content: o.content,
            sortOrder: o.sortOrder,
            isCorrect: o.isCorrect,
          },
          canView,
        ),
      );
      return {
        questionId: item.questionId,
        title: item.question.title,
        content: item.question.content,
        difficulty: item.question.difficulty,
        selectedOptionId: answer?.selectedOptionId ?? null,
        ...(canView
          ? {
              isCorrect: answer?.isCorrect ?? null,
              explanation: item.question.explanation ?? undefined,
            }
          : {}),
        options,
      };
    });

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      answersVisible: canView,
      practiceSet: attempt.practiceSet,
      review,
    };
  }

  async listMyAttempts(user: RequestUser, params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const items = await this.prisma.practiceAttempt.findMany({
      where: {
        userId: user.userId,
        status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        maxScore: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        practiceSet: {
          select: {
            id: true,
            title: true,
            slug: true,
            kind: true,
            examTag: true,
          },
        },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map((a) => ({
        ...a,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt?.toISOString() ?? null,
      })),
      nextCursor,
    };
  }

  async adminList(params: {
    cursor?: string;
    limit?: number;
    status?: PracticeSetStatus;
    kind?: string;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const kind = this.parseKind(params.kind);
    const items = await this.prisma.practiceSet.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(kind ? { kind } : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        _count: { select: { items: true, attempts: true } },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map(({ _count, ...rest }) => ({
        ...rest,
        questionCount: _count.items,
        attemptCount: _count.attempts,
      })),
      nextCursor,
    };
  }

  async adminCreate(user: RequestUser, dto: CreatePracticeSetDto) {
    const kind = this.requireKind(dto.kind);
    if (!dto.questionIds?.length) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'At least one question is required',
          newRequestId(),
        ),
      );
    }
    await this.assertQuestionsExist(dto.questionIds);

    return this.prisma.practiceSet.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() || null,
        kind,
        durationSeconds: dto.durationSeconds ?? null,
        marksPerCorrect: dto.marksPerCorrect ?? 1,
        negativeMarkPerWrong: dto.negativeMarkPerWrong ?? 0,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        examTag: dto.examTag?.trim() || null,
        isDaily: dto.isDaily ?? false,
        createdById: user.userId,
        status: PracticeSetStatus.DRAFT,
        items: {
          create: dto.questionIds.map((questionId, index) => ({
            questionId,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: true,
        category: true,
        subcategory: true,
      },
    });
  }

  async adminPublish(id: string) {
    const set = await this.prisma.practiceSet.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    if (set._count.items < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'Publish requires at least one question',
          newRequestId(),
        ),
      );
    }
    return this.prisma.practiceSet.update({
      where: { id },
      data: {
        status: PracticeSetStatus.PUBLISHED,
        publishedAt: set.publishedAt ?? new Date(),
      },
    });
  }

  async adminArchive(id: string) {
    const set = await this.prisma.practiceSet.findUnique({ where: { id } });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    return this.prisma.practiceSet.update({
      where: { id },
      data: { status: PracticeSetStatus.ARCHIVED },
    });
  }

  private async findPublishedSet(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const set = await this.prisma.practiceSet.findFirst({
      where: {
        status: PracticeSetStatus.PUBLISHED,
        ...(isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    return set;
  }

  private async findActiveAttempt(userId: string, practiceSetId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: {
        userId,
        practiceSetId,
        status: PracticeAttemptStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        practiceSetId: true,
        status: true,
        startedAt: true,
        maxScore: true,
      },
    });
    if (!attempt) return null;

    const set = await this.prisma.practiceSet.findUnique({
      where: { id: practiceSetId },
      select: { durationSeconds: true },
    });
    return {
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      durationSeconds: set?.durationSeconds ?? null,
      expiresAt:
        set?.durationSeconds != null
          ? new Date(attempt.startedAt.getTime() + set.durationSeconds * 1000).toISOString()
          : null,
    };
  }

  private async assertQuestionsExist(questionIds: string[]) {
    const count = await this.prisma.question.count({
      where: {
        id: { in: questionIds },
        deletedAt: null,
        status: QuestionStatus.PUBLISHED,
      },
    });
    if (count !== questionIds.length) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_QUESTIONS',
          'All questions must exist and be published',
          newRequestId(),
        ),
      );
    }
  }

  private parseKind(kind?: string): PracticeSetKind | undefined {
    if (!kind) return undefined;
    if (!KIND_VALUES.has(kind)) {
      throw new BadRequestException(
        createErrorResponse('INVALID_KIND', 'Invalid practice set kind', newRequestId()),
      );
    }
    return kind as PracticeSetKind;
  }

  private requireKind(kind: string): PracticeSetKind {
    const parsed = this.parseKind(kind);
    if (!parsed) {
      throw new BadRequestException(
        createErrorResponse('INVALID_KIND', 'Invalid practice set kind', newRequestId()),
      );
    }
    return parsed;
  }
}

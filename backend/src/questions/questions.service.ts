import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Difficulty, Prisma, QuestionStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly audit: AuditService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async createDraft(user: RequestUser, dto: CreateQuestionDto) {
    await this.assertCategoryPair(dto.categoryId, dto.subcategoryId);
    this.assertOptionShape(dto.options, false);

    return this.prisma.question.create({
      data: {
        title: dto.title.trim(),
        content: dto.content,
        explanation: dto.explanation,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        difficulty: dto.difficulty ?? Difficulty.MEDIUM,
        status: QuestionStatus.DRAFT,
        createdById: user.userId,
        options: {
          create: dto.options.map((o, index) => ({
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            sortOrder: index,
          })),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    if (dto.categoryId || dto.subcategoryId) {
      await this.assertCategoryPair(
        dto.categoryId ?? existing.categoryId,
        dto.subcategoryId ?? existing.subcategoryId ?? undefined,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        this.assertOptionShape(dto.options, false);
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: dto.options.map((o, index) => ({
            questionId: id,
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            sortOrder: index,
          })),
        });
      }

      return tx.question.update({
        where: { id },
        data: {
          ...(dto.title ? { title: dto.title.trim() } : {}),
          ...(dto.content ? { content: dto.content } : {}),
          ...(dto.explanation !== undefined ? { explanation: dto.explanation } : {}),
          ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
          ...(dto.subcategoryId !== undefined ? { subcategoryId: dto.subcategoryId } : {}),
          ...(dto.difficulty ? { difficulty: dto.difficulty } : {}),
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async publish(id: string, actorUserId?: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!question || question.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }
    this.assertOptionShape(question.options, true);

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        status: QuestionStatus.PUBLISHED,
        publishedAt: question.publishedAt ?? new Date(),
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.audit.record({
      actorUserId,
      action: 'QUESTION_PUBLISH',
      entityType: 'question',
      entityId: id,
    });
    return updated;
  }

  async archive(id: string, actorUserId?: string) {
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.ARCHIVED },
    });
    await this.audit.record({
      actorUserId,
      action: 'QUESTION_ARCHIVE',
      entityType: 'question',
      entityId: id,
    });
    return updated;
  }

  async adminList(params: {
    cursor?: string;
    limit?: number;
    status?: QuestionStatus;
    q?: string;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const items = await this.prisma.question.findMany({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
        ...(params.q
          ? {
              OR: [
                { title: { contains: params.q, mode: 'insensitive' } },
                { content: { contains: params.q, mode: 'insensitive' } },
                { sourceNote: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        category: true,
        subcategory: true,
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  /** Clone a question as a new DRAFT (options copied; status reset). */
  async duplicate(id: string, actorUserId: string) {
    const source = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!source) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const created = await this.prisma.question.create({
      data: {
        title: `${source.title} (copy)`.slice(0, 200),
        content: source.content,
        explanation: source.explanation,
        categoryId: source.categoryId,
        subcategoryId: source.subcategoryId,
        difficulty: source.difficulty,
        status: QuestionStatus.DRAFT,
        examTags: source.examTags,
        sourceNote: source.sourceNote,
        createdById: actorUserId,
        options: {
          create: source.options.map((o, index) => ({
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            sortOrder: index,
          })),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.audit.record({
      actorUserId,
      action: 'QUESTION_DUPLICATE',
      entityType: 'question',
      entityId: created.id,
      metadata: { sourceId: id },
    });

    return created;
  }

  async listPublished(
    user: RequestUser,
    params: {
      cursor?: string;
      limit?: number;
      categoryId?: string;
      subcategoryId?: string;
      difficulty?: Difficulty;
      q?: string;
      examTag?: string;
    },
  ) {
    const limit = Math.min(params.limit ?? 20, 100);
    const where: Prisma.QuestionWhereInput = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.examTag ? { examTags: { has: params.examTag } } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' } },
              { content: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.question.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        difficulty: true,
        publishedAt: true,
        examTags: true,
        sourceNote: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async getPublishedDetail(user: RequestUser, id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, status: QuestionStatus.PUBLISHED, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const canView = await this.access.canViewAnswers(dbUser);
    const bookmark = await this.prisma.questionBookmark.findUnique({
      where: {
        userId_questionId: { userId: user.userId, questionId: id },
      },
      select: {
        id: true,
        collectionId: true,
        collection: { select: { id: true, name: true } },
      },
    });

    const options = question.options.map(({ id: oid, label, content, isCorrect, sortOrder }) =>
      this.access.stripAnswerFields(
        { id: oid, label, content, isCorrect, sortOrder },
        canView,
      ),
    );

    return {
      id: question.id,
      title: question.title,
      content: question.content,
      difficulty: question.difficulty,
      examTags: question.examTags,
      sourceNote: question.sourceNote,
      category: question.category,
      subcategory: question.subcategory,
      options,
      explanation: canView ? (question.explanation ?? undefined) : undefined,
      publishedAt: question.publishedAt,
      bookmarked: Boolean(bookmark),
      collection: bookmark?.collection ?? null,
      answersVisible: canView,
    };
  }

  /**
   * Record a practice check. Correctness is computed server-side so post-trial
   * learners still get personal analytics without answer fields on GET detail.
   */
  async recordAttempt(user: RequestUser, questionId: string, selectedOptionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, status: QuestionStatus.PUBLISHED, deletedAt: null },
      select: { id: true, categoryId: true, subcategoryId: true },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const option = await this.prisma.questionOption.findFirst({
      where: { id: selectedOptionId, questionId },
      select: { id: true, isCorrect: true },
    });
    if (!option) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_OPTION',
          'Selected option does not belong to this question',
          newRequestId(),
        ),
      );
    }

    const attempt = await this.prisma.questionAttempt.create({
      data: {
        userId: user.userId,
        questionId: question.id,
        selectedOptionId: option.id,
        isCorrect: option.isCorrect,
        categoryId: question.categoryId,
      },
      select: {
        id: true,
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
        createdAt: true,
      },
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'QUESTION_ATTEMPT',
      subjectCategoryId: question.categoryId,
      topicCategoryId: question.subcategoryId,
      questionId: question.id,
      meta: { attemptId: attempt.id },
    });

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const canView = await this.access.canViewAnswers(dbUser);

    return {
      id: attempt.id,
      questionId: attempt.questionId,
      selectedOptionId: attempt.selectedOptionId,
      createdAt: attempt.createdAt.toISOString(),
      // Only echo correctness when answers are already entitled on the detail UI.
      ...(canView ? { isCorrect: attempt.isCorrect } : {}),
    };
  }

  async navigation(
    id: string,
    filters: {
      categoryId?: string;
      subcategoryId?: string;
      difficulty?: Difficulty;
      q?: string;
      examTag?: string;
    },
  ) {
    const current = await this.prisma.question.findFirst({
      where: { id, status: QuestionStatus.PUBLISHED, deletedAt: null },
    });
    if (!current?.publishedAt) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const base: Prisma.QuestionWhereInput = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.subcategoryId ? { subcategoryId: filters.subcategoryId } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(filters.examTag ? { examTags: { has: filters.examTag } } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: 'insensitive' } },
              { content: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const newer = await this.prisma.question.findFirst({
      where: {
        ...base,
        OR: [
          { publishedAt: { gt: current.publishedAt } },
          { publishedAt: current.publishedAt, id: { gt: current.id } },
        ],
      },
      orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    const older = await this.prisma.question.findFirst({
      where: {
        ...base,
        OR: [
          { publishedAt: { lt: current.publishedAt } },
          { publishedAt: current.publishedAt, id: { lt: current.id } },
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    return { prevId: older?.id ?? null, nextId: newer?.id ?? null };
  }

  async adminGet(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } }, category: true, subcategory: true },
    });
    if (!question || question.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }
    return question;
  }

  private assertOptionShape(
    options: Array<{ isCorrect: boolean }>,
    requireExactlyOne: boolean,
  ) {
    if (options.length < 2 || options.length > 6) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'INVALID_OPTIONS',
          'Questions must have between 2 and 6 options',
          newRequestId(),
        ),
      );
    }
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (requireExactlyOne && correctCount !== 1) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'INVALID_CORRECT_OPTION',
          'Exactly one correct option is required to publish',
          newRequestId(),
        ),
      );
    }
    if (!requireExactlyOne && correctCount > 1) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_CORRECT_OPTION',
          'At most one correct option is allowed',
          newRequestId(),
        ),
      );
    }
  }

  private async assertCategoryPair(categoryId: string, subcategoryId?: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.parentId) {
      throw new BadRequestException(
        createErrorResponse('INVALID_CATEGORY', 'Main category must be a root category', newRequestId()),
      );
    }
    if (subcategoryId) {
      const sub = await this.prisma.category.findUnique({ where: { id: subcategoryId } });
      if (!sub || sub.parentId !== categoryId) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_SUBCATEGORY',
            'Subcategory must be a child of the main category',
            newRequestId(),
          ),
        );
      }
    }
  }
}

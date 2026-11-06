import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Difficulty, Prisma, QuestionKind, QuestionStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly audit: AuditService,
  ) {}

  async createDraft(user: RequestUser, dto: CreateQuestionDto) {
    await this.assertCategoryPair(dto.categoryId, dto.subcategoryId);
    const kind = dto.kind ?? QuestionKind.MCQ;
    this.validateQuestionShape(kind, dto.options ?? [], dto.modelAnswer, false);

    return this.prisma.question.create({
      data: {
        title: dto.title.trim(),
        content: dto.content,
        explanation: dto.explanation,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        difficulty: dto.difficulty ?? Difficulty.MEDIUM,
        kind,
        modelAnswer: dto.modelAnswer,
        status: QuestionStatus.DRAFT,
        createdById: user.userId,
        options: {
          create: (dto.options ?? []).map((o, index) => ({
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

    const effectiveKind = dto.kind ?? existing.kind;
    const effectiveModelAnswer =
      dto.modelAnswer !== undefined ? dto.modelAnswer : existing.modelAnswer;
    // Validate the incoming shape against the effective kind. When options are
    // not being replaced, validate the stored options instead so a kind change
    // cannot leave an invalid combination behind.
    if (dto.options !== undefined) {
      this.validateQuestionShape(effectiveKind, dto.options, effectiveModelAnswer, false);
    } else if (
      (dto.kind !== undefined || dto.modelAnswer !== undefined) &&
      effectiveKind === QuestionKind.MCQ
    ) {
      // WRITTEN drops stored options on save, so only MCQ needs this check.
      const storedOptions = await this.prisma.questionOption.findMany({
        where: { questionId: id },
        select: { isCorrect: true },
      });
      this.validateQuestionShape(effectiveKind, storedOptions, effectiveModelAnswer, false);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.options) {
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
      } else if (effectiveKind === QuestionKind.WRITTEN) {
        // Switching to WRITTEN drops any stored options.
        await tx.questionOption.deleteMany({ where: { questionId: id } });
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
          ...(dto.kind ? { kind: dto.kind } : {}),
          ...(dto.modelAnswer !== undefined ? { modelAnswer: dto.modelAnswer } : {}),
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
    this.validateQuestionShape(question.kind, question.options, question.modelAnswer, true);

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

  async adminList(params: { cursor?: string; limit?: number; status?: QuestionStatus }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const items = await this.prisma.question.findMany({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
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

  async listPublished(
    user: RequestUser,
    params: {
      cursor?: string;
      limit?: number;
      categoryId?: string;
      subcategoryId?: string;
      difficulty?: Difficulty;
      kind?: QuestionKind;
      q?: string;
    },
  ) {
    const limit = Math.min(params.limit ?? 20, 100);
    const where: Prisma.QuestionWhereInput = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.kind ? { kind: params.kind } : {}),
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
        kind: true,
        publishedAt: true,
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
      select: { id: true },
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
      kind: question.kind,
      category: question.category,
      subcategory: question.subcategory,
      options,
      explanation: canView ? (question.explanation ?? undefined) : undefined,
      // Model answers are restricted content, same rule as explanations.
      modelAnswer: canView ? (question.modelAnswer ?? undefined) : undefined,
      publishedAt: question.publishedAt,
      bookmarked: Boolean(bookmark),
      answersVisible: canView,
    };
  }

  async navigation(
    id: string,
    filters: {
      categoryId?: string;
      subcategoryId?: string;
      difficulty?: Difficulty;
      kind?: QuestionKind;
      q?: string;
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
      ...(filters.kind ? { kind: filters.kind } : {}),
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

  /**
   * Record one free-practice attempt. The correctness boolean is returned
   * only when the user is entitled to see answers; otherwise `correct` is
   * null (absence, never a faked false) so the endpoint cannot leak keys.
   */
  async recordAttempt(
    user: RequestUser,
    questionId: string,
    selectedOptionId?: string,
  ): Promise<{ correct: boolean | null; questionId: string; selectedOptionId: string | null }> {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, status: QuestionStatus.PUBLISHED, deletedAt: null },
      select: { id: true, kind: true },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }
    if (question.kind === QuestionKind.WRITTEN) {
      throw new BadRequestException(
        createErrorResponse(
          'WRITTEN_QUESTION',
          'Written questions have no options to check',
          newRequestId(),
        ),
      );
    }
    if (!selectedOptionId) {
      throw new BadRequestException(
        createErrorResponse('VALIDATION_ERROR', 'selectedOptionId is required', newRequestId()),
      );
    }
    const option = await this.prisma.questionOption.findFirst({
      where: { id: selectedOptionId, questionId },
      select: { id: true, isCorrect: true },
    });
    if (!option) {
      throw new NotFoundException(
        createErrorResponse('OPTION_NOT_FOUND', 'Option not found for this question', newRequestId()),
      );
    }

    await this.prisma.questionAttempt.create({
      data: {
        userId: user.userId,
        questionId,
        selectedOptionId: option.id,
        isCorrect: option.isCorrect,
        examAttemptId: null,
      },
    });

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const canView = await this.access.canViewAnswers(dbUser);
    return {
      correct: canView ? option.isCorrect : null,
      questionId,
      selectedOptionId: option.id,
    };
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

  /**
   * Kind-aware shape validation. MCQ needs 2–6 options with at most one
   * correct at draft time (exactly one to publish); WRITTEN needs a model
   * answer and zero options.
   */
  private validateQuestionShape(
    kind: QuestionKind,
    options: Array<{ isCorrect: boolean }>,
    modelAnswer: string | null | undefined,
    requireExactlyOne: boolean,
  ) {
    if (kind === QuestionKind.WRITTEN) {
      if (options.length > 0) {
        throw new UnprocessableEntityException(
          createErrorResponse(
            'INVALID_OPTIONS',
            'Written questions must not have options',
            newRequestId(),
          ),
        );
      }
      if (!modelAnswer || !modelAnswer.trim()) {
        throw new UnprocessableEntityException(
          createErrorResponse(
            'MODEL_ANSWER_REQUIRED',
            'Written questions require a model answer',
            newRequestId(),
          ),
        );
      }
      return;
    }
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

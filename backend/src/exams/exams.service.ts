import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_EXAM_GUIDE_ITEMS,
  DEFAULT_EXAM_GUIDE_TITLE,
  createErrorResponse,
  type AdminExamDetail,
  type AdminExamQuestion,
  type ExamGuideConfig,
  type ExamGuideItem,
  type TimedAttemptSummary,
} from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';
import { paginateById, parseLimit } from '../common/pagination';
import { buildExamTemplateBuffer, parseExamWorkbook } from './exam-excel-parser';
import { slugifyExamTitle } from './exam-slug';
import type { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';
import type { UpdateExamDto, UpdateExamQuestionDto } from './dto/update-exam.dto';
import type { UpdateExamGuideDto } from './dto/update-exam-guide.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GUIDE_SINGLETON_ID = 'default';

function asStringOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

function normalizeGuideItems(raw: unknown): ExamGuideItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ExamGuideItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const id = String((entry as { id?: unknown }).id ?? '').trim();
    const text = String((entry as { text?: unknown }).text ?? '').trim();
    if (!id || !text) continue;
    out.push({ id: id.slice(0, 64), text: text.slice(0, 500) });
  }
  return out;
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplateBuffer(): Promise<Buffer> {
    return buildExamTemplateBuffer();
  }

  async listPublished(filters?: { q?: string; cursor?: string; limit?: number }) {
    const q = filters?.q?.trim();
    const limit = parseLimit(filters?.limit, 12);
    const rows = await this.prisma.exam.findMany({
      where: {
        isPublished: true,
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        totalQuestions: true,
        durationInMinutes: true,
        createdAt: true,
      },
    });
    return paginateById(rows, limit);
  }

  async getPublishedForTaking(idOrSlug: string) {
    const exam = await this.findPublished(idOrSlug);
    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: exam.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        questionText: true,
        options: true,
        sortOrder: true,
      },
    });

    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      durationInMinutes: exam.durationInMinutes,
      createdAt: exam.createdAt,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: asStringOptions(q.options),
        sortOrder: q.sortOrder,
      })),
    };
  }

  async submitAttempt(
    idOrSlug: string,
    dto: SubmitExamAttemptDto,
    actor: RequestUser | null = null,
  ) {
    const exam = await this.findPublished(idOrSlug);
    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: exam.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXAM_EMPTY', 'This exam has no questions', newRequestId()),
      );
    }

    let name = dto.userName?.trim() ?? '';
    let userId: string | null = null;
    if (actor?.userId) {
      const account = await this.prisma.user.findFirst({
        where: { id: actor.userId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (account) {
        userId = account.id;
        name = account.name.trim();
      }
    }
    if (name.length < 2) {
      throw new BadRequestException(
        createErrorResponse('NAME_REQUIRED', 'Full name is required', newRequestId()),
      );
    }

    const answers =
      dto.userAnswers && typeof dto.userAnswers === 'object' && !Array.isArray(dto.userAnswers)
        ? dto.userAnswers
        : {};
    const optionSetByQuestion = new Map(
      questions.map((q) => [q.id, new Set(asStringOptions(q.options))]),
    );

    let correctCount = 0;
    let wrongCount = 0;
    const normalizedAnswers: Record<string, string> = {};

    for (const q of questions) {
      const raw = typeof answers[q.id] === 'string' ? answers[q.id].trim() : '';
      const allowed = optionSetByQuestion.get(q.id);
      // Ignore forged answers that are not one of the four options.
      const selected = raw && allowed?.has(raw) ? raw : '';
      normalizedAnswers[q.id] = selected;
      if (!selected) {
        wrongCount += 1;
        continue;
      }
      if (selected === q.correctAnswer) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: exam.id,
        userId,
        userName: name.slice(0, 120),
        score: correctCount,
        correctCount,
        wrongCount,
        userAnswers: normalizedAnswers as Prisma.InputJsonValue,
        elapsedSeconds: dto.elapsedSeconds ?? null,
        timedOut: Boolean(dto.timedOut),
      },
    });

    return {
      attemptId: attempt.id,
      examId: exam.id,
      examSlug: exam.slug,
      userName: attempt.userName,
      score: attempt.score,
      totalQuestions: exam.totalQuestions,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      percent: exam.totalQuestions
        ? Math.round((correctCount / exam.totalQuestions) * 100)
        : 0,
      timedOut: attempt.timedOut,
      submittedAt: attempt.submittedAt,
    };
  }

  /** Attach a guest Quiz attempt to the newly registered / logged-in user. */
  async claimAttempt(userId: string, attemptId: string) {
    if (!UUID_RE.test(attemptId)) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true },
    });
    if (!attempt) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    if (attempt.userId && attempt.userId !== userId) {
      throw new ForbiddenException(
        createErrorResponse(
          'ATTEMPT_OWNED',
          'This attempt is already linked to another account',
          newRequestId(),
        ),
      );
    }
    if (attempt.userId === userId) {
      return { ok: true as const, alreadyLinked: true };
    }
    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: { userId },
    });
    return { ok: true as const, alreadyLinked: false };
  }

  async listMyAttempts(
    userId: string,
    opts: { cursor?: string; limit?: number },
  ): Promise<{ items: TimedAttemptSummary[]; nextCursor: string | null }> {
    const take = parseLimit(opts.limit, 20);
    const rows = await this.prisma.examAttempt.findMany({
      where: { userId },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      include: {
        exam: { select: { title: true, slug: true, totalQuestions: true } },
      },
    });
    const { items: pageRows, nextCursor } = paginateById(rows, take);

    const items: TimedAttemptSummary[] = pageRows.map((row) => {
      const total = row.exam.totalQuestions;
      const percent = total > 0 ? Math.round((row.score / total) * 100) : 0;
      return {
        id: row.id,
        kind: 'exam',
        title: row.exam.title,
        slug: row.exam.slug,
        score: row.score,
        totalQuestions: total,
        percent,
        submittedAt: row.submittedAt.toISOString(),
        resultPath: `/exams/${encodeURIComponent(row.exam.slug)}/result/${encodeURIComponent(row.id)}`,
      };
    });

    return { items, nextCursor };
  }

  async getAttemptResult(attemptId: string) {
    if (!UUID_RE.test(attemptId)) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            slug: true,
            totalQuestions: true,
            durationInMinutes: true,
            isPublished: true,
          },
        },
      },
    });

    if (!attempt || !attempt.exam.isPublished) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      orderBy: { sortOrder: 'asc' },
    });

    const userAnswers = (attempt.userAnswers ?? {}) as Record<string, string>;

    return {
      attemptId: attempt.id,
      userName: attempt.userName,
      score: attempt.score,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      percent: attempt.exam.totalQuestions
        ? Math.round((attempt.correctCount / attempt.exam.totalQuestions) * 100)
        : 0,
      timedOut: attempt.timedOut,
      elapsedSeconds: attempt.elapsedSeconds,
      submittedAt: attempt.submittedAt,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        slug: attempt.exam.slug,
        totalQuestions: attempt.exam.totalQuestions,
        durationInMinutes: attempt.exam.durationInMinutes,
      },
      answerSheet: questions.map((q) => {
        const selected = userAnswers[q.id] ?? '';
        const options = asStringOptions(q.options);
        const isCorrect = Boolean(selected) && selected === q.correctAnswer;
        return {
          id: q.id,
          questionText: q.questionText,
          options,
          selectedAnswer: selected || null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          isCorrect,
          isSkipped: !selected,
        };
      }),
    };
  }

  async createFromUpload(input: {
    title: string;
    description?: string | null;
    durationInMinutes: number;
    file: Express.Multer.File;
    createdById: string;
  }) {
    const title = input.title?.trim();
    if (!title) {
      throw new BadRequestException(
        createErrorResponse('TITLE_REQUIRED', 'Exam title is required', newRequestId()),
      );
    }
    if (!Number.isFinite(input.durationInMinutes) || input.durationInMinutes < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_DURATION',
          'Duration must be at least 1 minute',
          newRequestId(),
        ),
      );
    }
    if (input.durationInMinutes > 600) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_DURATION',
          'Duration cannot exceed 600 minutes',
          newRequestId(),
        ),
      );
    }
    if (!input.file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel file is required', newRequestId()),
      );
    }
    const lower = (input.file.originalname || '').toLowerCase();
    if (!lower.endsWith('.xlsx')) {
      throw new BadRequestException(
        createErrorResponse('INVALID_FILE_TYPE', 'Only .xlsx files are supported', newRequestId()),
      );
    }

    const parsed = await parseExamWorkbook(input.file.buffer);
    if (parsed.errors.length && parsed.rows.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXCEL_PARSE_FAILED', parsed.errors.join('; '), newRequestId()),
      );
    }
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXCEL_EMPTY', 'No valid questions found in the file', newRequestId()),
      );
    }

    const slug = await this.uniqueSlug(slugifyExamTitle(title));

    const exam = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          title: title.slice(0, 200),
          slug,
          description: input.description?.trim() || null,
          totalQuestions: parsed.rows.length,
          durationInMinutes: Math.floor(input.durationInMinutes),
          isPublished: true,
          createdById: input.createdById,
          questions: {
            create: parsed.rows.map((row, index) => ({
              questionText: row.questionText,
              options: row.options,
              correctAnswer: row.correctAnswer,
              explanation: row.explanation,
              sortOrder: index,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              sortOrder: true,
            },
          },
        },
      });
      return created;
    });

    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      durationInMinutes: exam.durationInMinutes,
      isPublished: exam.isPublished,
      createdAt: exam.createdAt,
      parseWarnings: parsed.errors,
      preview: exam.questions.slice(0, 20).map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: asStringOptions(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sortOrder: q.sortOrder,
      })),
    };
  }

  async listAdmin(filters?: { cursor?: string; limit?: number }) {
    const limit = parseLimit(filters?.limit, 20);
    const rows = await this.prisma.exam.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        totalQuestions: true,
        durationInMinutes: true,
        isPublished: true,
        createdAt: true,
        _count: { select: { attempts: true } },
      },
    });
    return paginateById(rows, limit);
  }

  /** Admin edit view: every question with its answer, published or not. */
  async getAdminDetail(id: string): Promise<AdminExamDetail> {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { attempts: true } },
      },
    });
    if (!exam) throw this.examNotFound();
    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      durationInMinutes: exam.durationInMinutes,
      isPublished: exam.isPublished,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
      attemptCount: exam._count.attempts,
      questions: exam.questions.map((q) => this.toAdminQuestion(q)),
    };
  }

  /** Edit title / description / duration / published. The slug is kept so links keep working. */
  async updateMeta(id: string, dto: UpdateExamDto): Promise<AdminExamDetail> {
    await this.assertExists(id);
    const data: Prisma.ExamUpdateInput = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException(
          createErrorResponse('TITLE_REQUIRED', 'Exam title is required', newRequestId()),
        );
      }
      data.title = title.slice(0, 200);
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.durationInMinutes !== undefined) data.durationInMinutes = dto.durationInMinutes;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    await this.prisma.exam.update({ where: { id }, data });
    return this.getAdminDetail(id);
  }

  /**
   * Edit one question. `correctAnswer` is stored as the option text (how attempts are
   * scored), so it is recomputed whenever the options or the chosen index change.
   * Scores of past attempts are not recalculated.
   */
  async updateQuestion(
    examId: string,
    questionId: string,
    dto: UpdateExamQuestionDto,
  ): Promise<AdminExamQuestion> {
    const question = await this.prisma.examQuestion.findFirst({
      where: { id: questionId, examId },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('EXAM_QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const currentOptions = asStringOptions(question.options);
    const options = dto.options ? dto.options.map((o) => o.trim()) : currentOptions;
    if (options.some((o) => !o)) {
      throw new BadRequestException(
        createErrorResponse('INVALID_OPTIONS', 'All four options are required', newRequestId()),
      );
    }
    if (new Set(options).size !== options.length) {
      // Answers are matched by option text, so duplicates would make scoring ambiguous.
      throw new BadRequestException(
        createErrorResponse('DUPLICATE_OPTIONS', 'Options must all be different', newRequestId()),
      );
    }
    const index = dto.correctOptionIndex ?? currentOptions.indexOf(question.correctAnswer);
    if (index < 0 || index >= options.length) {
      throw new BadRequestException(
        createErrorResponse('CORRECT_ANSWER_REQUIRED', 'Choose the correct option', newRequestId()),
      );
    }

    const data: Prisma.ExamQuestionUpdateInput = {
      options,
      correctAnswer: options[index],
    };
    if (dto.questionText !== undefined) {
      const text = dto.questionText.trim();
      if (!text) {
        throw new BadRequestException(
          createErrorResponse('QUESTION_REQUIRED', 'Question text is required', newRequestId()),
        );
      }
      data.questionText = text;
    }
    if (dto.explanation !== undefined) data.explanation = dto.explanation?.trim() || null;

    const updated = await this.prisma.examQuestion.update({ where: { id: questionId }, data });
    return this.toAdminQuestion(updated);
  }

  /** Permanently deletes the quiz with its questions and all attempts (cascade). */
  async remove(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { attempts: true } } },
    });
    if (!exam) throw this.examNotFound();
    await this.prisma.exam.delete({ where: { id } });
    return { id: exam.id, title: exam.title, deletedAttempts: exam._count.attempts, deleted: true };
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.exam.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw this.examNotFound();
  }

  private examNotFound() {
    return new NotFoundException(
      createErrorResponse('EXAM_NOT_FOUND', 'Exam not found', newRequestId()),
    );
  }

  private toAdminQuestion(q: {
    id: string;
    questionText: string;
    options: Prisma.JsonValue;
    correctAnswer: string;
    explanation: string | null;
    sortOrder: number;
  }): AdminExamQuestion {
    const options = asStringOptions(q.options);
    return {
      id: q.id,
      questionText: q.questionText,
      options,
      correctAnswer: q.correctAnswer,
      correctOptionIndex: options.indexOf(q.correctAnswer),
      explanation: q.explanation,
      sortOrder: q.sortOrder,
    };
  }

  /** Public + admin: Quiz listing sidebar guide. Seeds defaults when missing. */
  async getGuide(): Promise<ExamGuideConfig> {
    const row = await this.prisma.examGuideConfig.findUnique({
      where: { id: GUIDE_SINGLETON_ID },
    });
    if (!row) {
      const seeded = await this.prisma.examGuideConfig.create({
        data: {
          id: GUIDE_SINGLETON_ID,
          title: DEFAULT_EXAM_GUIDE_TITLE,
          items: DEFAULT_EXAM_GUIDE_ITEMS as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        title: seeded.title,
        items: normalizeGuideItems(seeded.items),
        updatedAt: seeded.updatedAt.toISOString(),
      };
    }
    return {
      title: row.title.trim() || DEFAULT_EXAM_GUIDE_TITLE,
      items: normalizeGuideItems(row.items),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateGuide(
    dto: UpdateExamGuideDto,
    updatedById?: string,
  ): Promise<ExamGuideConfig> {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException(
        createErrorResponse(
          'GUIDE_TITLE_REQUIRED',
          'Guide title is required',
          newRequestId(),
        ),
      );
    }

    const seen = new Set<string>();
    const items: ExamGuideItem[] = [];
    for (const raw of dto.items ?? []) {
      const id = String(raw.id ?? '').trim().slice(0, 64);
      const text = String(raw.text ?? '').trim().slice(0, 500);
      if (!id || !text) {
        throw new BadRequestException(
          createErrorResponse(
            'GUIDE_ITEM_INVALID',
            'Each guide step needs a non-empty id and text',
            newRequestId(),
          ),
        );
      }
      if (seen.has(id)) {
        throw new BadRequestException(
          createErrorResponse(
            'GUIDE_ITEM_DUPLICATE',
            'Guide step ids must be unique',
            newRequestId(),
          ),
        );
      }
      seen.add(id);
      items.push({ id, text });
    }

    const row = await this.prisma.examGuideConfig.upsert({
      where: { id: GUIDE_SINGLETON_ID },
      create: {
        id: GUIDE_SINGLETON_ID,
        title,
        items: items as unknown as Prisma.InputJsonValue,
        updatedById: updatedById ?? null,
      },
      update: {
        title,
        items: items as unknown as Prisma.InputJsonValue,
        updatedById: updatedById ?? null,
      },
    });

    return {
      title: row.title,
      items: normalizeGuideItems(row.items),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findPublished(idOrSlug: string) {
    const where = UUID_RE.test(idOrSlug)
      ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isPublished: true }
      : { slug: idOrSlug, isPublished: true };

    const exam = await this.prisma.exam.findFirst({ where });
    if (!exam) {
      throw new NotFoundException(
        createErrorResponse('EXAM_NOT_FOUND', 'Exam not found', newRequestId()),
      );
    }
    return exam;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base.slice(0, 200);
    for (let i = 0; i < 20; i += 1) {
      const existing = await this.prisma.exam.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${base.slice(0, 180)}-${i + 2}`;
    }
    return `${base.slice(0, 160)}-${Date.now().toString(36)}`;
  }
}

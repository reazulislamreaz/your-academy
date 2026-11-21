import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_MODEL_TEST_GUIDE_ITEMS,
  DEFAULT_MODEL_TEST_GUIDE_TITLE,
  createErrorResponse,
  type ModelTestGuideConfig,
  type ModelTestGuideItem,
} from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';
import { paginateById, parseLimit } from '../common/pagination';
import {
  buildModelTestTemplateBuffer,
  parseModelTestWorkbook,
} from './model-test-excel-parser';
import { slugifyModelTestTitle } from './model-test-slug';
import type { SubmitModelTestAttemptDto } from './dto/submit-model-test-attempt.dto';
import type { UpdateModelTestGuideDto } from './dto/update-model-test-guide.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GUIDE_SINGLETON_ID = 'default';

function normalizeGuideItems(raw: unknown): ModelTestGuideItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ModelTestGuideItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const id = String((entry as { id?: unknown }).id ?? '').trim();
    const text = String((entry as { text?: unknown }).text ?? '').trim();
    if (!id || !text) continue;
    out.push({ id: id.slice(0, 64), text: text.slice(0, 500) });
  }
  return out;
}

function asStringOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

@Injectable()
export class ModelTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplateBuffer(): Promise<Buffer> {
    return buildModelTestTemplateBuffer();
  }

  async listPublished(filters?: {
    q?: string;
    year?: number;
    categoryId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const q = filters?.q?.trim();
    const year = filters?.year;
    const categoryId = filters?.categoryId?.trim();
    const limit = parseLimit(filters?.limit, 12);
    const where: Prisma.ModelTestWhereInput = {
      isPublished: true,
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      ...(year != null && Number.isFinite(year) ? { examYear: year } : {}),
      ...(categoryId && UUID_RE.test(categoryId) ? { categoryId } : {}),
    };

    const rows = await this.prisma.modelTest.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        examYear: true,
        totalQuestions: true,
        durationInMinutes: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    return paginateById(rows, limit);
  }

  async listFilterYears(): Promise<number[]> {
    const rows = await this.prisma.modelTest.findMany({
      where: { isPublished: true, examYear: { not: null } },
      select: { examYear: true },
      distinct: ['examYear'],
      orderBy: { examYear: 'desc' },
    });
    return rows
      .map((r) => r.examYear)
      .filter((y): y is number => typeof y === 'number');
  }

  async listCategories() {
    return this.prisma.modelTestCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  /** Categories that have at least one published Model Test (public filter). */
  async listPublishedCategories() {
    return this.prisma.modelTestCategory.findMany({
      where: { modelTests: { some: { isPublished: true } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  async createCategory(nameRaw: string) {
    const name = nameRaw?.trim();
    if (!name || name.length < 2) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_NAME_REQUIRED',
          'Category name must be at least 2 characters',
          newRequestId(),
        ),
      );
    }
    if (name.length > 120) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_NAME_TOO_LONG',
          'Category name must be 120 characters or fewer',
          newRequestId(),
        ),
      );
    }

    const baseSlug = slugifyModelTestTitle(name).slice(0, 140);
    let slug = baseSlug;
    for (let i = 0; i < 20; i += 1) {
      const clash = await this.prisma.modelTestCategory.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!clash) break;
      slug = `${baseSlug.slice(0, 120)}-${i + 2}`;
    }

    try {
      return await this.prisma.modelTestCategory.create({
        data: { name: name.slice(0, 120), slug },
        select: { id: true, name: true, slug: true },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          createErrorResponse(
            'CATEGORY_EXISTS',
            'A category with this name already exists',
            newRequestId(),
          ),
        );
      }
      throw err;
    }
  }

  private async resolveCategoryId(categoryId?: string | null): Promise<string | null> {
    if (!categoryId?.trim()) return null;
    const id = categoryId.trim();
    if (!UUID_RE.test(id)) {
      throw new BadRequestException(
        createErrorResponse('INVALID_CATEGORY', 'Invalid category id', newRequestId()),
      );
    }
    const found = await this.prisma.modelTestCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException(
        createErrorResponse('CATEGORY_NOT_FOUND', 'Category not found', newRequestId()),
      );
    }
    return found.id;
  }

  async getPublishedForTaking(idOrSlug: string) {
    const modelTest = await this.findPublished(idOrSlug);
    const questions = await this.prisma.modelTestQuestion.findMany({
      where: { modelTestId: modelTest.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        questionText: true,
        options: true,
        sortOrder: true,
      },
    });

    return {
      id: modelTest.id,
      title: modelTest.title,
      slug: modelTest.slug,
      description: modelTest.description,
      examYear: modelTest.examYear,
      category: modelTest.category
        ? {
            id: modelTest.category.id,
            name: modelTest.category.name,
            slug: modelTest.category.slug,
          }
        : null,
      totalQuestions: modelTest.totalQuestions,
      durationInMinutes: modelTest.durationInMinutes,
      createdAt: modelTest.createdAt,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: asStringOptions(q.options),
        sortOrder: q.sortOrder,
      })),
    };
  }

  async submitAttempt(idOrSlug: string, dto: SubmitModelTestAttemptDto) {
    const modelTest = await this.findPublished(idOrSlug);
    const questions = await this.prisma.modelTestQuestion.findMany({
      where: { modelTestId: modelTest.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        createErrorResponse('MODEL_TEST_EMPTY', 'This model test has no questions', newRequestId()),
      );
    }

    const name = dto.userName?.trim() ?? '';
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
    let skippedCount = 0;
    const normalizedAnswers: Record<string, string> = {};

    for (const q of questions) {
      const raw = typeof answers[q.id] === 'string' ? answers[q.id].trim() : '';
      const allowed = optionSetByQuestion.get(q.id);
      const selected = raw && allowed?.has(raw) ? raw : '';
      normalizedAnswers[q.id] = selected;
      if (!selected) {
        skippedCount += 1;
        continue;
      }
      if (selected === q.correctAnswer) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const attempt = await this.prisma.modelTestAttempt.create({
      data: {
        modelTestId: modelTest.id,
        userName: name.slice(0, 120),
        score: correctCount,
        correctCount,
        wrongCount,
        skippedCount,
        userAnswers: normalizedAnswers,
        elapsedSeconds: dto.elapsedSeconds ?? null,
        timedOut: Boolean(dto.timedOut),
      },
    });

    const totalQuestions = questions.length;
    const percent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;

    return {
      attemptId: attempt.id,
      modelTestId: modelTest.id,
      modelTestSlug: modelTest.slug,
      userName: attempt.userName,
      score: correctCount,
      totalQuestions,
      correctCount,
      wrongCount,
      skippedCount,
      percent,
      timedOut: attempt.timedOut,
      submittedAt: attempt.submittedAt,
    };
  }

  async getAttemptResult(attemptId: string) {
    const attempt = await this.prisma.modelTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        modelTest: {
          select: {
            id: true,
            title: true,
            slug: true,
            totalQuestions: true,
            durationInMinutes: true,
            examYear: true,
          },
        },
      },
    });
    if (!attempt) {
      throw new NotFoundException(
        createErrorResponse('MODEL_TEST_ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const questions = await this.prisma.modelTestQuestion.findMany({
      where: { modelTestId: attempt.modelTestId },
      orderBy: { sortOrder: 'asc' },
    });

    const userAnswers =
      attempt.userAnswers &&
      typeof attempt.userAnswers === 'object' &&
      !Array.isArray(attempt.userAnswers)
        ? (attempt.userAnswers as Record<string, string>)
        : {};

    const totalQuestions = attempt.modelTest.totalQuestions;
    const percent =
      totalQuestions > 0
        ? Math.round((attempt.correctCount / totalQuestions) * 1000) / 10
        : 0;

    return {
      attemptId: attempt.id,
      userName: attempt.userName,
      score: attempt.score,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      percent,
      timedOut: attempt.timedOut,
      elapsedSeconds: attempt.elapsedSeconds,
      submittedAt: attempt.submittedAt,
      modelTest: {
        id: attempt.modelTest.id,
        title: attempt.modelTest.title,
        slug: attempt.modelTest.slug,
        totalQuestions: attempt.modelTest.totalQuestions,
        durationInMinutes: attempt.modelTest.durationInMinutes,
        examYear: attempt.modelTest.examYear,
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
    examYear?: number | null;
    categoryId?: string | null;
    isPublished?: boolean;
    file: Express.Multer.File;
    createdById: string;
  }) {
    let title = input.title?.trim();
    if (!input.file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel file is required', newRequestId()),
      );
    }
    const lower = (input.file.originalname || '').toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Only .xlsx / .xls files are supported',
          newRequestId(),
        ),
      );
    }
    if (lower.endsWith('.xls') && !lower.endsWith('.xlsx')) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Legacy .xls is not supported — save as .xlsx and upload again',
          newRequestId(),
        ),
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

    const parsed = await parseModelTestWorkbook(input.file.buffer);
    if (!title && parsed.suggestedTitle) {
      title = parsed.suggestedTitle;
    }
    if (!title) {
      throw new BadRequestException(
        createErrorResponse('TITLE_REQUIRED', 'Model test title is required', newRequestId()),
      );
    }
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

    const description =
      input.description?.trim() ||
      parsed.suggestedDescription ||
      null;
    const examYear =
      input.examYear != null && Number.isFinite(input.examYear)
        ? Math.floor(input.examYear)
        : parsed.suggestedYear;

    const slug = await this.uniqueSlug(slugifyModelTestTitle(title));
    const isPublished = input.isPublished !== false;
    const categoryId = await this.resolveCategoryId(input.categoryId);

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.modelTest.create({
        data: {
          title: title!.slice(0, 200),
          slug,
          description,
          examYear: examYear ?? null,
          categoryId,
          totalQuestions: parsed.rows.length,
          durationInMinutes: Math.floor(input.durationInMinutes),
          isPublished,
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
          category: { select: { id: true, name: true, slug: true } },
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
    });

    return {
      id: created.id,
      title: created.title,
      slug: created.slug,
      description: created.description,
      examYear: created.examYear,
      category: created.category,
      totalQuestions: created.totalQuestions,
      durationInMinutes: created.durationInMinutes,
      isPublished: created.isPublished,
      createdAt: created.createdAt,
      headerRowNumber: parsed.headerRowNumber,
      suggestedTitle: parsed.suggestedTitle,
      parseWarnings: parsed.errors,
      preview: created.questions.slice(0, 20).map((q) => ({
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
    const rows = await this.prisma.modelTest.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        examYear: true,
        totalQuestions: true,
        durationInMinutes: true,
        isPublished: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { attempts: true } },
      },
    });
    return paginateById(rows, limit);
  }

  async setPublished(id: string, isPublished: boolean) {
    const existing = await this.prisma.modelTest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('MODEL_TEST_NOT_FOUND', 'Model test not found', newRequestId()),
      );
    }
    return this.prisma.modelTest.update({
      where: { id },
      data: { isPublished },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
      },
    });
  }

  async updateMeta(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      durationInMinutes?: number;
      examYear?: number | null;
      categoryId?: string | null;
    },
  ) {
    const existing = await this.prisma.modelTest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('MODEL_TEST_NOT_FOUND', 'Model test not found', newRequestId()),
      );
    }

    const data: Prisma.ModelTestUpdateInput = {};
    if (input.title != null) {
      const title = input.title.trim();
      if (!title) {
        throw new BadRequestException(
          createErrorResponse('TITLE_REQUIRED', 'Model test title is required', newRequestId()),
        );
      }
      data.title = title.slice(0, 200);
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.durationInMinutes != null) {
      if (!Number.isFinite(input.durationInMinutes) || input.durationInMinutes < 1) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_DURATION',
            'Duration must be at least 1 minute',
            newRequestId(),
          ),
        );
      }
      data.durationInMinutes = Math.floor(input.durationInMinutes);
    }
    if (input.examYear !== undefined) {
      data.examYear =
        input.examYear == null || !Number.isFinite(input.examYear)
          ? null
          : Math.floor(input.examYear);
    }
    if (input.categoryId !== undefined) {
      const categoryId = await this.resolveCategoryId(input.categoryId);
      data.category = categoryId
        ? { connect: { id: categoryId } }
        : { disconnect: true };
    }

    return this.prisma.modelTest.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        examYear: true,
        durationInMinutes: true,
        isPublished: true,
        totalQuestions: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.modelTest.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('MODEL_TEST_NOT_FOUND', 'Model test not found', newRequestId()),
      );
    }
    await this.prisma.modelTest.delete({ where: { id } });
    return { id: existing.id, title: existing.title, deleted: true };
  }

  /** Public + admin: listing sidebar guide. Seeds defaults when the singleton row is missing. */
  async getGuide(): Promise<ModelTestGuideConfig> {
    const row = await this.prisma.modelTestGuideConfig.findUnique({
      where: { id: GUIDE_SINGLETON_ID },
    });
    if (!row) {
      const seeded = await this.prisma.modelTestGuideConfig.create({
        data: {
          id: GUIDE_SINGLETON_ID,
          title: DEFAULT_MODEL_TEST_GUIDE_TITLE,
          items: DEFAULT_MODEL_TEST_GUIDE_ITEMS as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        title: seeded.title,
        items: normalizeGuideItems(seeded.items),
        updatedAt: seeded.updatedAt.toISOString(),
      };
    }
    return {
      title: row.title.trim() || DEFAULT_MODEL_TEST_GUIDE_TITLE,
      items: normalizeGuideItems(row.items),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateGuide(
    dto: UpdateModelTestGuideDto,
    updatedById?: string,
  ): Promise<ModelTestGuideConfig> {
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
    const items: ModelTestGuideItem[] = [];
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

    const row = await this.prisma.modelTestGuideConfig.upsert({
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

    const modelTest = await this.prisma.modelTest.findFirst({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!modelTest) {
      throw new NotFoundException(
        createErrorResponse('MODEL_TEST_NOT_FOUND', 'Model test not found', newRequestId()),
      );
    }
    return modelTest;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base.slice(0, 200);
    for (let i = 0; i < 20; i += 1) {
      const existing = await this.prisma.modelTest.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${base.slice(0, 180)}-${i + 2}`;
    }
    return `${base.slice(0, 160)}-${Date.now().toString(36)}`;
  }
}

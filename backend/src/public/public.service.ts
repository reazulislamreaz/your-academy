import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryScope,
  Difficulty,
  Prisma,
  QuestionStatus,
  QuestionUploadStatus,
} from '@prisma/client';
import {
  createErrorResponse,
  type PublicPracticeScore,
  type PublicPracticeScoreItem,
} from '@your-academy/shared';
import { AccessPolicyService, type ViewerAccess } from '../billing/access-policy.service';
import { SET_DISPLAY_ORDER } from '../billing/set-order';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

const BN_LABEL: Record<string, string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
  // IBA questions (5 options) — DEC IBA upload.
  E: 'ঙ',
};

/** Normalize admin-entered exam year / question-date year to a 4-digit calendar year. */
function normalizeExamYear(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^\d{4}$/.test(t)) return t;
  const match = t.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/) ?? t.match(/^(\d{4})/);
  return match?.[1] ?? null;
}

export type PublicQuestionCard = {
  id: string;
  title: string;
  content: string;
  difficulty: Difficulty;
  examTags: string[];
  sourceNote: string | null;
  /** @deprecated Prefer serial/sectionTitle; kept null so UI no longer shows category after stem. */
  sourceLabel: string | null;
  sourceSerial: string | null;
  examYear: string | null;
  sectionTitle: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
  correctAnswerLabel: string;
  correctAnswerBn: string;
  createdAt: string;
  publishedAt: string | null;
  uploadBatchId: string | null;
  rowNumber: number | null;
};

export type PublicQuestionSet = {
  id: string;
  /** DEC-060 — true when this viewer must buy a plan to open the set (questions withheld). */
  locked: boolean;
  batchCode: string;
  title: string;
  description: string | null;
  subject: string | null;
  topic: string | null;
  examCategory: string | null;
  examYear: string | null;
  sheetPreamble: string | null;
  questionCount: number;
  uploadedAt: string;
  importedAt: string | null;
  placements: Array<{
    subcategoryId: string;
    subcategoryName: string;
    categoryId: string;
    categoryName: string;
  }>;
};

/** DEC-040 — public Written Question Bank card (descriptive / model answer). */
export type PublicWrittenQuestionCard = {
  id: string;
  title: string;
  content: string;
  modelAnswer: string | null;
  marks: string | null;
  sourceSerial: string | null;
  examYear: string | null;
  sectionTitle: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  createdAt: string;
  publishedAt: string | null;
  uploadBatchId: string | null;
  rowNumber: number | null;
};

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessPolicyService,
  ) {}

  /**
   * Ensure filter IDs belong to the requested bank scope.
   * Wrong-scope IDs resolve to an empty filter (no cross-bank leakage).
   */
  private async resolveScopedTaxonomyFilter(
    scope: CategoryScope,
    categoryId?: string,
    subcategoryId?: string,
  ): Promise<{ categoryId?: string; subcategoryId?: string; empty: boolean }> {
    if (subcategoryId) {
      const sub = await this.prisma.category.findFirst({
        where: {
          id: subcategoryId,
          scope,
          parentId: { not: null },
          isActive: true,
        },
        select: { id: true, parentId: true },
      });
      if (!sub?.parentId) return { empty: true };
      if (categoryId && categoryId !== sub.parentId) {
        const parentOk = await this.prisma.category.findFirst({
          where: { id: categoryId, scope, parentId: null, isActive: true },
          select: { id: true },
        });
        if (!parentOk || parentOk.id !== sub.parentId) return { empty: true };
      }
      return { empty: false, subcategoryId: sub.id, categoryId: sub.parentId };
    }
    if (categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: categoryId, scope, parentId: null, isActive: true },
        select: { id: true },
      });
      if (!cat) return { empty: true };
      return { empty: false, categoryId: cat.id };
    }
    return { empty: false };
  }

  async stats() {
    const [questions, categories, news, documents, questionSets] = await Promise.all([
      this.prisma.question.count({
        where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.category.count({
        where: { isActive: true, parentId: null, scope: 'PRELIMINARY' },
      }),
      this.prisma.news.count({
        where: { isPublished: true, deletedAt: null },
      }),
      this.prisma.document.count({
        where: { isPublished: true, deletedAt: null },
      }),
      this.prisma.questionUploadBatch.count({
        where: {
          status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
          questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
        },
      }),
    ]);
    return { questions, categories, news, documents, questionSets };
  }

  /**
   * Distinct years for Preli year filter.
   * Prefer `questionDate` (admin question date); fall back to denormalized `examYear`.
   * Never hard-coded.
   */
  async listQuestionSetYears(): Promise<string[]> {
    const [datedQuestions, batchYears, questionYears] = await Promise.all([
      this.prisma.question.findMany({
        where: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          uploadBatchId: { not: null },
          questionDate: { not: null },
        },
        distinct: ['questionDate'],
        select: { questionDate: true },
      }),
      this.prisma.questionUploadBatch.findMany({
        where: {
          status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
          examYear: { not: null },
          questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
        },
        distinct: ['examYear'],
        select: { examYear: true },
      }),
      this.prisma.question.findMany({
        where: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          examYear: { not: null },
          uploadBatchId: { not: null },
        },
        distinct: ['examYear'],
        select: { examYear: true },
      }),
    ]);
    const years = new Set<string>();
    for (const row of datedQuestions) {
      if (row.questionDate) years.add(String(row.questionDate.getUTCFullYear()));
    }
    for (const row of [...batchYears, ...questionYears]) {
      const normalized = normalizeExamYear(row.examYear);
      if (normalized) years.add(normalized);
    }
    return [...years].sort((a, b) => Number(b) - Number(a) || b.localeCompare(a));
  }

  /** Public Question Sets = completed/archived upload batches with live published MCQs. */
  async listQuestionSets(
    params: {
      cursor?: string;
      limit?: number;
      q?: string;
      categoryId?: string;
      subcategoryId?: string;
      year?: string;
    },
    access: ViewerAccess,
  ) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const q = params.q?.trim();
    const year = params.year?.trim() || undefined;
    const scoped = await this.resolveScopedTaxonomyFilter(
      CategoryScope.PRELIMINARY,
      params.categoryId?.trim() || undefined,
      params.subcategoryId?.trim() || undefined,
    );
    if (scoped.empty) {
      return { items: [], nextCursor: null as string | null, total: 0 };
    }
    const categoryId = scoped.categoryId;
    const subcategoryId = scoped.subcategoryId;

    const liveQuestion: Prisma.QuestionWhereInput = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    };

    const yearStart = year ? new Date(Date.UTC(Number(year), 0, 1)) : null;
    const yearEnd = year ? new Date(Date.UTC(Number(year) + 1, 0, 1)) : null;
    const yearMatch: Prisma.QuestionUploadBatchWhereInput | undefined = year
      ? {
          OR: [
            {
              questionDate: { gte: yearStart!, lt: yearEnd! },
              questions: { some: liveQuestion },
            },
            { examYear: year, questions: { some: liveQuestion } },
            { examYear: { startsWith: year }, questions: { some: liveQuestion } },
            {
              questions: {
                some: {
                  ...liveQuestion,
                  questionDate: { gte: yearStart!, lt: yearEnd! },
                },
              },
            },
            { questions: { some: { ...liveQuestion, examYear: year } } },
            { questions: { some: { ...liveQuestion, examYear: { startsWith: year } } } },
          ],
        }
      : { questions: { some: liveQuestion } };

    const placementMatch: Prisma.QuestionUploadBatchWhereInput | undefined = subcategoryId
      ? {
          OR: [
            { placements: { some: { subcategoryId } } },
            { questions: { some: { ...liveQuestion, subcategoryId } } },
          ],
        }
      : categoryId
        ? {
            OR: [
              { questions: { some: { ...liveQuestion, categoryId } } },
              { placements: { some: { categoryId } } },
            ],
          }
        : undefined;

    const where: Prisma.QuestionUploadBatchWhereInput = {
      status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
      AND: [
        yearMatch,
        ...(placementMatch ? [placementMatch] : []),
        ...(q
          ? ([
              {
                OR: [
                  { displayName: { contains: q, mode: 'insensitive' as const } },
                  { batchCode: { contains: q, mode: 'insensitive' as const } },
                  { examCategoryHint: { contains: q, mode: 'insensitive' as const } },
                  { subjectHint: { contains: q, mode: 'insensitive' as const } },
                  { topicHint: { contains: q, mode: 'insensitive' as const } },
                  { sheetPreamble: { contains: q, mode: 'insensitive' as const } },
                  {
                    placements: {
                      some: {
                        OR: [
                          {
                            category: {
                              name: { contains: q, mode: 'insensitive' as const },
                            },
                          },
                          {
                            subcategory: {
                              name: { contains: q, mode: 'insensitive' as const },
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    questions: {
                      some: {
                        ...liveQuestion,
                        OR: [
                          {
                            category: {
                              name: { contains: q, mode: 'insensitive' as const },
                            },
                          },
                          {
                            subcategory: {
                              name: { contains: q, mode: 'insensitive' as const },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            ] satisfies Prisma.QuestionUploadBatchWhereInput[])
          : []),
      ],
    };

    const batches = await this.prisma.questionUploadBatch.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [...SET_DISPLAY_ORDER],
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        description: true,
        subjectHint: true,
        topicHint: true,
        examCategoryHint: true,
        examYear: true,
        questionDate: true,
        sheetPreamble: true,
        createdAt: true,
        importedAt: true,
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            categoryId: true,
            subcategoryId: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        _count: {
          select: {
            questions: {
              where: year
                ? {
                    ...liveQuestion,
                    OR: [{ examYear: year }, { examYear: { startsWith: year } }],
                  }
                : liveQuestion,
            },
          },
        },
      },
    });

    const nextCursor = batches.length > limit ? batches.pop()!.id : null;
    // DEC-060: locked sets stay listed (title only) so learners see what a plan unlocks.
    const free = access.fullAccess ? null : await this.access.freePreliSetIds(access);
    const items: PublicQuestionSet[] = batches.map((b) =>
      this.mapSet(b, free !== null && !free.has(b.id)),
    );

    const total = await this.prisma.questionUploadBatch.count({ where });

    return { items, nextCursor, total };
  }

  async getQuestionSet(id: string, access: ViewerAccess): Promise<PublicQuestionSet> {
    const batch = await this.prisma.questionUploadBatch.findFirst({
      where: {
        id,
        status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
        questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
      },
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        description: true,
        subjectHint: true,
        topicHint: true,
        examCategoryHint: true,
        examYear: true,
        sheetPreamble: true,
        createdAt: true,
        importedAt: true,
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            categoryId: true,
            subcategoryId: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        _count: {
          select: {
            questions: {
              where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
            },
          },
        },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_SET_NOT_FOUND', 'Question set not found', newRequestId()),
      );
    }
    const open = await this.access.canAccess(access, { kind: 'PRELI_SET', id: batch.id });
    return this.mapSet(batch, !open);
  }

  async listSetQuestions(
    batchId: string,
    params: { cursor?: string; limit?: number; q?: string },
    access: ViewerAccess,
  ) {
    // DEC-060: a locked set's questions are never loaded.
    if ((await this.getQuestionSet(batchId, access)).locked) throw this.access.lockedError(access);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const { rows, allIds } = await this.resolveSetQuestionIds(batchId, params.q?.trim());
    const total = allIds.length;

    let start = 0;
    if (params.cursor) {
      const idx = allIds.indexOf(params.cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const pageIds = allIds.slice(start, start + limit);
    const nextCursor =
      start + limit < allIds.length ? pageIds[pageIds.length - 1] ?? null : null;

    if (!pageIds.length) {
      return { items: [] as PublicQuestionCard[], nextCursor: null, total };
    }

    const questions = await this.prisma.question.findMany({
      where: { id: { in: pageIds } },
      select: {
        id: true,
        title: true,
        content: true,
        difficulty: true,
        examTags: true,
        sourceNote: true,
        sourceSerial: true,
        examYear: true,
        sectionTitle: true,
        createdAt: true,
        publishedAt: true,
        uploadBatchId: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        options: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            label: true,
            content: true,
            sortOrder: true,
            isCorrect: true,
          },
        },
        importRows: {
          where: { batchId },
          select: { rowNumber: true, serial: true, sectionTitle: true },
          take: 1,
        },
      },
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    const rowNumberById = new Map(rows.map((r) => [r.createdQuestionId!, r.rowNumber]));

    const items: PublicQuestionCard[] = pageIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) =>
        this.toCard(q, rowNumberById.get(q.id) ?? q.importRows[0]?.rowNumber ?? null),
      );

    return { items, nextCursor, total };
  }

  /** Score a Preli Practice run on the server (locked sets cannot be scored — DEC-060). */
  async scoreSetPractice(
    batchId: string,
    answersRaw: Record<string, unknown>,
    access: ViewerAccess,
  ): Promise<PublicPracticeScore> {
    if ((await this.getQuestionSet(batchId, access)).locked) throw this.access.lockedError(access);
    const { allIds } = await this.resolveSetQuestionIds(batchId);
    const questions = allIds.length
      ? await this.prisma.question.findMany({
          where: { id: { in: allIds } },
          select: {
            id: true,
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, isCorrect: true },
            },
          },
        })
      : [];
    const byId = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const answerSheet: PublicPracticeScoreItem[] = [];

    for (const id of allIds) {
      const q = byId.get(id);
      if (!q) continue;
      const raw = answersRaw[id];
      const candidate = typeof raw === 'string' ? raw.trim() : '';
      // Ignore forged option ids that do not belong to this question.
      const selectedOptionId = q.options.some((o) => o.id === candidate) ? candidate : null;
      const correct = q.options.find((o) => o.isCorrect) ?? null;
      const isSkipped = !selectedOptionId;
      const isCorrect = Boolean(selectedOptionId && correct && selectedOptionId === correct.id);
      if (isSkipped) skippedCount += 1;
      else if (isCorrect) correctCount += 1;
      else wrongCount += 1;

      answerSheet.push({
        id,
        selectedOptionId,
        isSkipped,
        isCorrect,
        correctOptionId: correct?.id ?? null,
        correctAnswerLabel: correct?.label ?? '',
      });
    }

    const totalQuestions = answerSheet.length;
    return {
      setId: batchId,
      totalQuestions,
      correctCount,
      wrongCount,
      skippedCount,
      score: correctCount,
      percent:
        totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 1000) / 10,
      answerSheet,
    };
  }

  /** Ordered published question ids for an upload set (import row order, then orphans). */
  private async resolveSetQuestionIds(batchId: string, q?: string) {

    // Preserve original upload order via import rowNumber when available.
    const rows = await this.prisma.questionImportRow.findMany({
      where: {
        batchId,
        createdQuestionId: { not: null },
        createdQuestion: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { content: { contains: q, mode: 'insensitive' } },
                  { sourceNote: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      orderBy: [{ rowNumber: 'asc' }],
      select: {
        rowNumber: true,
        createdQuestionId: true,
      },
    });

    const orderedIds = rows
      .map((r) => r.createdQuestionId)
      .filter((id): id is string => Boolean(id));

    // Fallback: questions linked to batch without import-row pointer
    const orphaned = await this.prisma.question.findMany({
      where: {
        uploadBatchId: batchId,
        status: QuestionStatus.PUBLISHED,
        deletedAt: null,
        id: { notIn: orderedIds.length ? orderedIds : ['00000000-0000-0000-0000-000000000000'] },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
                { sourceNote: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    const allIds = [...orderedIds, ...orphaned.map((o) => o.id)];
    return { rows, allIds };
  }

  async listPublishedQuestions(params: {
    cursor?: string;
    limit?: number;
    categoryId?: string;
    subcategoryId?: string;
    difficulty?: Difficulty;
    q?: string;
    examTag?: string;
    uploadBatchId?: string;
  }, access: ViewerAccess) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    if (params.uploadBatchId) {
      return this.listSetQuestions(
        params.uploadBatchId,
        {
          cursor: params.cursor,
          limit,
          q: params.q,
        },
        access,
      );
    }

    // DEC-060: questions from locked Preli sets are left out entirely.
    const open = await this.access.openPreliQuestionsWhere(access);
    const where: Prisma.QuestionWhereInput = open
      ? { AND: [this.buildWhere(params), open] }
      : this.buildWhere(params);
    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        take: limit + 1,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          title: true,
          content: true,
          difficulty: true,
          examTags: true,
          sourceNote: true,
          sourceSerial: true,
          examYear: true,
          sectionTitle: true,
          createdAt: true,
          publishedAt: true,
          uploadBatchId: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          options: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              label: true,
              content: true,
              sortOrder: true,
              isCorrect: true,
            },
          },
          importRows: {
            select: { rowNumber: true, serial: true, sectionTitle: true },
            take: 1,
            orderBy: { rowNumber: 'asc' },
          },
        },
      }),
    ]);

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    const cards = items.map((q) => this.toCard(q, q.importRows[0]?.rowNumber ?? null));
    return { items: cards, nextCursor, total };
  }

  private toCard(
    q: {
      id: string;
      title: string;
      content: string;
      difficulty: Difficulty;
      examTags: string[];
      sourceNote: string | null;
      sourceSerial?: string | null;
      examYear?: string | null;
      sectionTitle?: string | null;
      createdAt: Date;
      publishedAt: Date | null;
      uploadBatchId: string | null;
      category: { id: string; name: string; slug: string };
      subcategory: { id: string; name: string; slug: string } | null;
      options: Array<{
        id: string;
        label: string;
        content: string;
        sortOrder: number;
        isCorrect: boolean;
      }>;
      importRows?: Array<{ serial?: string | null; sectionTitle?: string | null }>;
    },
    rowNumber: number | null,
  ): PublicQuestionCard {
    const correct = q.options.find((o) => o.isCorrect);
    const correctAnswerLabel = correct?.label ?? '';
    const importMeta = q.importRows?.[0];
    return {
      id: q.id,
      title: q.title,
      content: q.content,
      difficulty: q.difficulty,
      examTags: q.examTags,
      sourceNote: q.sourceNote,
      // Product brief: do not show category/exam badge under the stem.
      sourceLabel: null,
      sourceSerial: q.sourceSerial ?? importMeta?.serial ?? null,
      examYear: q.examYear ?? null,
      sectionTitle: q.sectionTitle ?? importMeta?.sectionTitle ?? null,
      category: q.category,
      subcategory: q.subcategory,
      options: q.options.map(({ id, label, content, sortOrder }) => ({
        id,
        label,
        content,
        sortOrder,
      })),
      correctAnswerLabel,
      correctAnswerBn: BN_LABEL[correctAnswerLabel] ?? correctAnswerLabel,
      createdAt: q.createdAt.toISOString(),
      publishedAt: q.publishedAt?.toISOString() ?? null,
      uploadBatchId: q.uploadBatchId,
      rowNumber,
    };
  }

  private mapSet(batch: {
    id: string;
    batchCode: string;
    displayName: string;
    description: string | null;
    subjectHint: string | null;
    topicHint: string | null;
    examCategoryHint: string | null;
    examYear: string | null;
    sheetPreamble: string | null;
    createdAt: Date;
    importedAt: Date | null;
    placements: Array<{
      categoryId: string;
      subcategoryId: string;
      category: { name: string };
      subcategory: { name: string };
    }>;
    _count: { questions: number };
  }, locked = false): PublicQuestionSet {
    return {
      id: batch.id,
      locked,
      batchCode: batch.batchCode,
      title: this.setTitle(batch),
      description: batch.description,
      subject: batch.subjectHint,
      topic: batch.topicHint,
      examCategory: batch.examCategoryHint,
      examYear: batch.examYear,
      sheetPreamble: batch.sheetPreamble,
      questionCount: batch._count.questions,
      uploadedAt: batch.createdAt.toISOString(),
      importedAt: batch.importedAt?.toISOString() ?? null,
      placements: batch.placements.map((p) => ({
        categoryId: p.categoryId,
        categoryName: p.category.name,
        subcategoryId: p.subcategoryId,
        subcategoryName: p.subcategory.name,
      })),
    };
  }

  /** Prefer Admin collection/display name for public Exam Set titles. */
  private setTitle(batch: {
    displayName: string;
    examCategoryHint: string | null;
    subjectHint: string | null;
  }): string {
    if (batch.displayName?.trim()) return batch.displayName.trim();
    if (batch.examCategoryHint?.trim()) return batch.examCategoryHint.trim();
    if (batch.subjectHint?.trim()) return batch.subjectHint.trim();
    return 'Question Set';
  }

  private buildWhere(params: {
    categoryId?: string;
    subcategoryId?: string;
    difficulty?: Difficulty;
    q?: string;
    examTag?: string;
    uploadBatchId?: string;
  }): Prisma.QuestionWhereInput {
    return {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
      ...(params.uploadBatchId ? { uploadBatchId: params.uploadBatchId } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.examTag ? { examTags: { has: params.examTag } } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' } },
              { content: { contains: params.q, mode: 'insensitive' } },
              { sourceNote: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  // ─── Written Question Bank (DEC-040) ─────────────────────────────────────

  async listWrittenQuestionSetYears(): Promise<string[]> {
    const [datedQuestions, batchYears, questionYears] = await Promise.all([
      this.prisma.writtenQuestion.findMany({
        where: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          uploadBatchId: { not: null },
          questionDate: { not: null },
        },
        distinct: ['questionDate'],
        select: { questionDate: true },
      }),
      this.prisma.writtenUploadBatch.findMany({
        where: {
          status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
          examYear: { not: null },
          questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
        },
        distinct: ['examYear'],
        select: { examYear: true },
      }),
      this.prisma.writtenQuestion.findMany({
        where: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          examYear: { not: null },
          uploadBatchId: { not: null },
        },
        distinct: ['examYear'],
        select: { examYear: true },
      }),
    ]);
    const years = new Set<string>();
    for (const row of datedQuestions) {
      if (row.questionDate) years.add(String(row.questionDate.getUTCFullYear()));
    }
    for (const row of [...batchYears, ...questionYears]) {
      const normalized = normalizeExamYear(row.examYear);
      if (normalized) years.add(normalized);
    }
    return [...years].sort((a, b) => Number(b) - Number(a) || b.localeCompare(a));
  }

  async listWrittenQuestionSets(
    params: {
      cursor?: string;
      limit?: number;
      q?: string;
      categoryId?: string;
      subcategoryId?: string;
      year?: string;
    },
    access: ViewerAccess,
  ) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const q = params.q?.trim();
    const year = params.year?.trim() || undefined;
    const scoped = await this.resolveScopedTaxonomyFilter(
      CategoryScope.WRITTEN,
      params.categoryId?.trim() || undefined,
      params.subcategoryId?.trim() || undefined,
    );
    if (scoped.empty) {
      return { items: [], nextCursor: null as string | null, total: 0 };
    }
    const categoryId = scoped.categoryId;
    const subcategoryId = scoped.subcategoryId;

    const liveQuestion: Prisma.WrittenQuestionWhereInput = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    };

    const yearStart = year ? new Date(Date.UTC(Number(year), 0, 1)) : null;
    const yearEnd = year ? new Date(Date.UTC(Number(year) + 1, 0, 1)) : null;
    const yearMatch: Prisma.WrittenUploadBatchWhereInput | undefined = year
      ? {
          OR: [
            {
              questionDate: { gte: yearStart!, lt: yearEnd! },
              questions: { some: liveQuestion },
            },
            { examYear: year, questions: { some: liveQuestion } },
            { examYear: { startsWith: year }, questions: { some: liveQuestion } },
            {
              questions: {
                some: {
                  ...liveQuestion,
                  questionDate: { gte: yearStart!, lt: yearEnd! },
                },
              },
            },
            { questions: { some: { ...liveQuestion, examYear: year } } },
            { questions: { some: { ...liveQuestion, examYear: { startsWith: year } } } },
          ],
        }
      : { questions: { some: liveQuestion } };

    const placementMatch: Prisma.WrittenUploadBatchWhereInput | undefined = subcategoryId
      ? {
          OR: [
            { placements: { some: { subcategoryId } } },
            { questions: { some: { ...liveQuestion, subcategoryId } } },
          ],
        }
      : categoryId
        ? {
            OR: [
              { questions: { some: { ...liveQuestion, categoryId } } },
              { placements: { some: { categoryId } } },
            ],
          }
        : undefined;

    const where: Prisma.WrittenUploadBatchWhereInput = {
      status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
      AND: [
        yearMatch,
        ...(placementMatch ? [placementMatch] : []),
        ...(q
          ? ([
              {
                OR: [
                  { displayName: { contains: q, mode: 'insensitive' as const } },
                  { batchCode: { contains: q, mode: 'insensitive' as const } },
                  { examCategoryHint: { contains: q, mode: 'insensitive' as const } },
                  { subjectHint: { contains: q, mode: 'insensitive' as const } },
                  { topicHint: { contains: q, mode: 'insensitive' as const } },
                  { sheetPreamble: { contains: q, mode: 'insensitive' as const } },
                ],
              },
            ] satisfies Prisma.WrittenUploadBatchWhereInput[])
          : []),
      ],
    };

    const batches = await this.prisma.writtenUploadBatch.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [...SET_DISPLAY_ORDER],
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        description: true,
        subjectHint: true,
        topicHint: true,
        examCategoryHint: true,
        examYear: true,
        questionDate: true,
        sheetPreamble: true,
        createdAt: true,
        importedAt: true,
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            categoryId: true,
            subcategoryId: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        _count: {
          select: {
            questions: {
              where: year
                ? {
                    ...liveQuestion,
                    OR: [{ examYear: year }, { examYear: { startsWith: year } }],
                  }
                : liveQuestion,
            },
          },
        },
      },
    });

    const nextCursor = batches.length > limit ? batches.pop()!.id : null;
    const free = access.fullAccess ? null : await this.access.freeWrittenSetIds(access);
    const items = batches.map((b) => this.mapSet(b, free !== null && !free.has(b.id)));
    const total = await this.prisma.writtenUploadBatch.count({ where });
    return { items, nextCursor, total };
  }

  async getWrittenQuestionSet(id: string, access: ViewerAccess): Promise<PublicQuestionSet> {
    const batch = await this.prisma.writtenUploadBatch.findFirst({
      where: {
        id,
        status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
        questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
      },
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        description: true,
        subjectHint: true,
        topicHint: true,
        examCategoryHint: true,
        examYear: true,
        sheetPreamble: true,
        createdAt: true,
        importedAt: true,
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            categoryId: true,
            subcategoryId: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        _count: {
          select: {
            questions: {
              where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
            },
          },
        },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse(
          'WRITTEN_QUESTION_SET_NOT_FOUND',
          'Written question set not found',
          newRequestId(),
        ),
      );
    }
    const open = await this.access.canAccess(access, { kind: 'WRITTEN_SET', id: batch.id });
    return this.mapSet(batch, !open);
  }

  async listWrittenSetQuestions(
    batchId: string,
    params: { cursor?: string; limit?: number; q?: string },
    access: ViewerAccess,
  ) {
    if ((await this.getWrittenQuestionSet(batchId, access)).locked) {
      throw this.access.lockedError(access);
    }
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const q = params.q?.trim();

    const rows = await this.prisma.writtenImportRow.findMany({
      where: {
        batchId,
        createdQuestionId: { not: null },
        createdQuestion: {
          status: QuestionStatus.PUBLISHED,
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { content: { contains: q, mode: 'insensitive' } },
                  { modelAnswer: { contains: q, mode: 'insensitive' } },
                  { sourceNote: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      orderBy: [{ rowNumber: 'asc' }],
      select: { rowNumber: true, createdQuestionId: true },
    });

    const orderedIds = rows
      .map((r) => r.createdQuestionId)
      .filter((id): id is string => Boolean(id));

    const orphaned = await this.prisma.writtenQuestion.findMany({
      where: {
        uploadBatchId: batchId,
        status: QuestionStatus.PUBLISHED,
        deletedAt: null,
        id: { notIn: orderedIds.length ? orderedIds : ['00000000-0000-0000-0000-000000000000'] },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
                { modelAnswer: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    const allIds = [...orderedIds, ...orphaned.map((o) => o.id)];
    const total = allIds.length;
    let start = 0;
    if (params.cursor) {
      const idx = allIds.indexOf(params.cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const pageIds = allIds.slice(start, start + limit);
    const nextCursor =
      start + limit < allIds.length ? pageIds[pageIds.length - 1] ?? null : null;

    if (!pageIds.length) {
      return { items: [] as PublicWrittenQuestionCard[], nextCursor: null, total };
    }

    const questions = await this.prisma.writtenQuestion.findMany({
      where: { id: { in: pageIds } },
      select: {
        id: true,
        title: true,
        content: true,
        modelAnswer: true,
        marks: true,
        sourceSerial: true,
        examYear: true,
        sectionTitle: true,
        createdAt: true,
        publishedAt: true,
        uploadBatchId: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });

    const byId = new Map(questions.map((item) => [item.id, item]));
    const rowNumberById = new Map(rows.map((r) => [r.createdQuestionId!, r.rowNumber]));

    const items: PublicWrittenQuestionCard[] = pageIds
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        modelAnswer: item.modelAnswer,
        marks: item.marks != null ? String(item.marks) : null,
        sourceSerial: item.sourceSerial,
        examYear: item.examYear,
        sectionTitle: item.sectionTitle,
        category: item.category,
        subcategory: item.subcategory,
        createdAt: item.createdAt.toISOString(),
        publishedAt: item.publishedAt?.toISOString() ?? null,
        uploadBatchId: item.uploadBatchId,
        rowNumber: rowNumberById.get(item.id) ?? null,
      }));

    return { items, nextCursor, total };
  }

  /** Topic Base directory: Category → Sub Category → Child Category (DEC-042). */
  async listTopicDirectory() {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true, scope: CategoryScope.TOPIC },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true, scope: CategoryScope.TOPIC },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { topicSubQuestions: true } },
            children: {
              where: { isActive: true, scope: CategoryScope.TOPIC },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                _count: { select: { topicChildQuestions: true } },
              },
            },
          },
        },
      },
    });

    return roots.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      description: root.description,
      iconKey: root.iconKey,
      sortOrder: root.sortOrder,
      children: root.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        iconKey: child.iconKey,
        sortOrder: child.sortOrder,
        questionCount: child._count.topicSubQuestions,
        parentId: root.id,
        parentName: root.name,
        children: child.children.map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          description: g.description,
          iconKey: g.iconKey,
          sortOrder: g.sortOrder,
          questionCount: g._count.topicChildQuestions,
          parentId: child.id,
          parentName: child.name,
        })),
      })),
    }));
  }

  /**
   * Resolve a Topic node by id — Level 1 (Category), Level 2 (Sub), or Level 3 (Child).
   * Questions: L1 by categoryId (all nested), L2 by subcategoryId, L3 by childCategoryId.
   */
  async getTopicSubcategory(topicNodeId: string) {
    const node = await this.prisma.category.findFirst({
      where: {
        id: topicNodeId,
        scope: CategoryScope.TOPIC,
        isActive: true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconKey: true,
            parentId: true,
            parent: { select: { id: true, name: true, slug: true, iconKey: true } },
          },
        },
        _count: {
          select: {
            topicQuestions: true,
            topicSubQuestions: true,
            topicChildQuestions: true,
            children: true,
          },
        },
      },
    });
    if (!node) {
      throw new NotFoundException(
        createErrorResponse('TOPIC_NOT_FOUND', 'Topic not found', newRequestId()),
      );
    }

    // Level 1 — root Category
    if (!node.parentId) {
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        description: node.description,
        iconKey: node.iconKey,
        level: 'category' as const,
        questionCount: node._count.topicQuestions,
        folderCount: node._count.children,
        category: {
          id: node.id,
          name: node.name,
          slug: node.slug,
          iconKey: node.iconKey,
        },
        subcategory: null,
        childCategory: null,
      };
    }

    if (!node.parent) {
      throw new NotFoundException(
        createErrorResponse('TOPIC_NOT_FOUND', 'Topic not found', newRequestId()),
      );
    }

    const isChildCategory = Boolean(node.parent.parentId);
    if (isChildCategory) {
      const subcategory = node.parent;
      const category = node.parent.parent;
      if (!category) {
        throw new NotFoundException(
          createErrorResponse('TOPIC_NOT_FOUND', 'Topic not found', newRequestId()),
        );
      }
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        description: node.description,
        iconKey: node.iconKey,
        level: 'child' as const,
        questionCount: node._count.topicChildQuestions,
        folderCount: 0,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          iconKey: category.iconKey,
        },
        subcategory: {
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          iconKey: subcategory.iconKey,
        },
        childCategory: {
          id: node.id,
          name: node.name,
          slug: node.slug,
          iconKey: node.iconKey,
        },
      };
    }

    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      iconKey: node.iconKey,
      level: 'subcategory' as const,
      questionCount: node._count.topicSubQuestions,
      folderCount: node._count.children,
      category: {
        id: node.parent.id,
        name: node.parent.name,
        slug: node.parent.slug,
        iconKey: node.parent.iconKey,
      },
      subcategory: { id: node.id, name: node.name, slug: node.slug, iconKey: node.iconKey },
      childCategory: null,
    };
  }

  async listTopicQuestions(params: {
    subcategoryId: string;
    cursor?: string;
    limit: number;
    q?: string;
  }) {
    const meta = await this.getTopicSubcategory(params.subcategoryId);

    // Folder selection includes nested Topic questions under that node.
    const scopeWhere: Prisma.TopicQuestionWhereInput =
      meta.level === 'category'
        ? { categoryId: meta.id }
        : meta.level === 'child'
          ? { childCategoryId: meta.id }
          : {
              OR: [
                { subcategoryId: meta.id },
                { childCategory: { parentId: meta.id, scope: CategoryScope.TOPIC } },
              ],
            };

    const where: Prisma.TopicQuestionWhereInput = {
      ...scopeWhere,
      ...(params.q?.trim()
        ? {
            OR: [
              { questionText: { contains: params.q.trim(), mode: 'insensitive' } },
              { examLabel: { contains: params.q.trim(), mode: 'insensitive' } },
              { sourceSerial: { contains: params.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.topicQuestion.count({ where });
    const take = params.limit + 1;
    const rows = await this.prisma.topicQuestion.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take,
      ...(params.cursor
        ? {
            skip: 1,
            cursor: { id: params.cursor },
          }
        : {}),
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true, iconKey: true } },
        childCategory: { select: { id: true, name: true, slug: true, iconKey: true } },
      },
    });

    const nextCursor = rows.length > params.limit ? rows[params.limit - 1]?.id : null;
    const page = rows.slice(0, params.limit);

    const keyToLabel: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

    const items = page.map((q) => {
      const options = [
        { id: `${q.id}-A`, label: 'A', content: q.optionA, sortOrder: 0 },
        { id: `${q.id}-B`, label: 'B', content: q.optionB, sortOrder: 1 },
        { id: `${q.id}-C`, label: 'C', content: q.optionC, sortOrder: 2 },
        { id: `${q.id}-D`, label: 'D', content: q.optionD, sortOrder: 3 },
      ];
      const correctAnswerLabel = q.correctKey ? keyToLabel[q.correctKey] ?? '' : '';
      return {
        id: q.id,
        title: q.questionText.slice(0, 200),
        content: q.questionText,
        difficulty: 'MEDIUM' as Difficulty,
        examTags: [] as string[],
        sourceNote: q.examLabel,
        sourceLabel: null as string | null,
        sourceSerial: q.sourceSerial,
        examYear: null as string | null,
        sectionTitle: null as string | null,
        examLabel: q.examLabel,
        category: q.category,
        subcategory: q.subcategory
          ? {
              id: q.subcategory.id,
              name: q.subcategory.name,
              slug: q.subcategory.slug,
            }
          : null,
        childCategory: q.childCategory
          ? {
              id: q.childCategory.id,
              name: q.childCategory.name,
              slug: q.childCategory.slug,
            }
          : null,
        options,
        correctAnswerLabel,
        correctAnswerBn: correctAnswerLabel ? BN_LABEL[correctAnswerLabel] ?? '' : '',
        createdAt: q.createdAt.toISOString(),
        publishedAt: q.createdAt.toISOString(),
        uploadBatchId: q.batchId,
        rowNumber: q.rowNumber,
      };
    });

    return { items, nextCursor, total };
  }

  /**
   * Title-first Topic collections for a leaf Sub Category or Child Category.
   * Category (L1) and intermediate Sub folders with children return no sets.
   */
  async listTopicSets(
    topicNodeId: string,
    params: { cursor?: string; limit?: number } = {},
  ) {
    const empty = {
      items: [] as Array<{
        id: string;
        batchCode: string;
        title: string;
        questionCount: number;
        uploadedAt: string;
        importedAt: string | null;
        category: { id: string; name: string };
        subcategory: { id: string; name: string };
        childCategory: { id: string; name: string } | null;
      }>,
      nextCursor: null as string | null,
      total: 0,
    };

    const meta = await this.getTopicSubcategory(topicNodeId);
    if (meta.level === 'category') {
      return empty;
    }

    if (meta.level === 'subcategory' && (meta.folderCount ?? 0) > 0) {
      // Intermediate folder — only child folders, not sets.
      return empty;
    }

    const where: Prisma.TopicUploadBatchWhereInput = {
      status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
      questions: { some: {} },
      ...(meta.level === 'child'
        ? { childCategoryId: meta.id }
        : { subcategoryId: meta.id, childCategoryId: null }),
    };

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const [total, batches] = await Promise.all([
      this.prisma.topicUploadBatch.count({ where }),
      this.prisma.topicUploadBatch.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          batchCode: true,
          displayName: true,
          createdAt: true,
          importedAt: true,
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          childCategory: { select: { id: true, name: true } },
          _count: { select: { questions: true } },
        },
      }),
    ]);

    const nextCursor = batches.length > limit ? batches.pop()!.id : null;
    const items = batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      title: b.displayName,
      questionCount: b._count.questions,
      uploadedAt: b.createdAt.toISOString(),
      importedAt: b.importedAt?.toISOString() ?? null,
      category: b.category,
      subcategory: b.subcategory,
      childCategory: b.childCategory,
    }));

    return { items, nextCursor, total };
  }

  async getTopicSet(batchId: string) {
    const batch = await this.prisma.topicUploadBatch.findFirst({
      where: {
        id: batchId,
        status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
        questions: { some: {} },
      },
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        createdAt: true,
        importedAt: true,
        categoryId: true,
        subcategoryId: true,
        childCategoryId: true,
        category: { select: { id: true, name: true, slug: true, iconKey: true } },
        subcategory: { select: { id: true, name: true, slug: true, iconKey: true } },
        childCategory: { select: { id: true, name: true, slug: true, iconKey: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('TOPIC_SET_NOT_FOUND', 'Topic set not found', newRequestId()),
      );
    }
    return {
      id: batch.id,
      batchCode: batch.batchCode,
      title: batch.displayName,
      questionCount: batch._count.questions,
      uploadedAt: batch.createdAt.toISOString(),
      importedAt: batch.importedAt?.toISOString() ?? null,
      category: batch.category,
      subcategory: batch.subcategory,
      childCategory: batch.childCategory,
      categoryId: batch.categoryId,
      subcategoryId: batch.subcategoryId,
      childCategoryId: batch.childCategoryId,
    };
  }

  async listTopicSetQuestions(params: {
    batchId: string;
    cursor?: string;
    limit: number;
    q?: string;
  }) {
    await this.getTopicSet(params.batchId);

    const where: Prisma.TopicQuestionWhereInput = {
      batchId: params.batchId,
      ...(params.q?.trim()
        ? {
            OR: [
              { questionText: { contains: params.q.trim(), mode: 'insensitive' } },
              { examLabel: { contains: params.q.trim(), mode: 'insensitive' } },
              { sourceSerial: { contains: params.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.topicQuestion.count({ where });
    const take = params.limit + 1;
    const rows = await this.prisma.topicQuestion.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take,
      ...(params.cursor
        ? {
            skip: 1,
            cursor: { id: params.cursor },
          }
        : {}),
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true, iconKey: true } },
        childCategory: { select: { id: true, name: true, slug: true, iconKey: true } },
      },
    });

    const nextCursor = rows.length > params.limit ? rows[params.limit - 1]?.id : null;
    const page = rows.slice(0, params.limit);
    const keyToLabel: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

    const items = page.map((q) => {
      const options = [
        { id: `${q.id}-A`, label: 'A', content: q.optionA, sortOrder: 0 },
        { id: `${q.id}-B`, label: 'B', content: q.optionB, sortOrder: 1 },
        { id: `${q.id}-C`, label: 'C', content: q.optionC, sortOrder: 2 },
        { id: `${q.id}-D`, label: 'D', content: q.optionD, sortOrder: 3 },
      ];
      const correctAnswerLabel = q.correctKey ? keyToLabel[q.correctKey] ?? '' : '';
      return {
        id: q.id,
        title: q.questionText.slice(0, 200),
        content: q.questionText,
        difficulty: 'MEDIUM' as Difficulty,
        examTags: [] as string[],
        sourceNote: q.examLabel,
        sourceLabel: null as string | null,
        sourceSerial: q.sourceSerial,
        examYear: null as string | null,
        sectionTitle: null as string | null,
        examLabel: q.examLabel,
        category: q.category,
        subcategory: q.subcategory
          ? {
              id: q.subcategory.id,
              name: q.subcategory.name,
              slug: q.subcategory.slug,
            }
          : null,
        childCategory: q.childCategory
          ? {
              id: q.childCategory.id,
              name: q.childCategory.name,
              slug: q.childCategory.slug,
            }
          : null,
        options,
        correctAnswerLabel,
        correctAnswerBn: correctAnswerLabel ? BN_LABEL[correctAnswerLabel] ?? '' : '',
        createdAt: q.createdAt.toISOString(),
        publishedAt: q.createdAt.toISOString(),
        uploadBatchId: q.batchId,
        rowNumber: q.rowNumber,
      };
    });

    return { items, nextCursor, total };
  }
}

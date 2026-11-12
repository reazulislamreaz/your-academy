import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Prisma, QuestionStatus, QuestionUploadStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

const BN_LABEL: Record<string, string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
};

export type PublicQuestionCard = {
  id: string;
  title: string;
  content: string;
  difficulty: Difficulty;
  examTags: string[];
  sourceNote: string | null;
  sourceLabel: string | null;
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
  batchCode: string;
  title: string;
  description: string | null;
  subject: string | null;
  topic: string | null;
  examCategory: string | null;
  questionCount: number;
  uploadedAt: string;
  importedAt: string | null;
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [questions, categories, news, documents, questionSets] = await Promise.all([
      this.prisma.question.count({
        where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.category.count({
        where: { isActive: true, parentId: null },
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

  /** Public Question Sets = completed/archived upload batches with live published MCQs. */
  async listQuestionSets(params: { cursor?: string; limit?: number; q?: string }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const q = params.q?.trim();

    const batches = await this.prisma.questionUploadBatch.findMany({
      where: {
        status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
        questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { batchCode: { contains: q, mode: 'insensitive' } },
                { examCategoryHint: { contains: q, mode: 'insensitive' } },
                { subjectHint: { contains: q, mode: 'insensitive' } },
                { topicHint: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ importedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        batchCode: true,
        displayName: true,
        description: true,
        subjectHint: true,
        topicHint: true,
        examCategoryHint: true,
        createdAt: true,
        importedAt: true,
        _count: {
          select: {
            questions: {
              where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
            },
          },
        },
      },
    });

    const nextCursor = batches.length > limit ? batches.pop()!.id : null;
    const items: PublicQuestionSet[] = batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      title: this.setTitle(b),
      description: b.description,
      subject: b.subjectHint,
      topic: b.topicHint,
      examCategory: b.examCategoryHint,
      questionCount: b._count.questions,
      uploadedAt: b.createdAt.toISOString(),
      importedAt: b.importedAt?.toISOString() ?? null,
    }));

    const total = await this.prisma.questionUploadBatch.count({
      where: {
        status: { in: [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED] },
        questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { batchCode: { contains: q, mode: 'insensitive' } },
                { examCategoryHint: { contains: q, mode: 'insensitive' } },
                { subjectHint: { contains: q, mode: 'insensitive' } },
                { topicHint: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });

    return { items, nextCursor, total };
  }

  async getQuestionSet(id: string): Promise<PublicQuestionSet> {
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
        createdAt: true,
        importedAt: true,
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
    return {
      id: batch.id,
      batchCode: batch.batchCode,
      title: this.setTitle(batch),
      description: batch.description,
      subject: batch.subjectHint,
      topic: batch.topicHint,
      examCategory: batch.examCategoryHint,
      questionCount: batch._count.questions,
      uploadedAt: batch.createdAt.toISOString(),
      importedAt: batch.importedAt?.toISOString() ?? null,
    };
  }

  async listSetQuestions(
    batchId: string,
    params: { cursor?: string; limit?: number; q?: string },
  ) {
    await this.getQuestionSet(batchId);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const q = params.q?.trim();

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
          select: { rowNumber: true },
          take: 1,
        },
      },
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    const rowNumberById = new Map(rows.map((r) => [r.createdQuestionId!, r.rowNumber]));

    const items: PublicQuestionCard[] = pageIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => this.toCard(q, rowNumberById.get(q.id) ?? q.importRows[0]?.rowNumber ?? null));

    return { items, nextCursor, total };
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
  }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    if (params.uploadBatchId) {
      return this.listSetQuestions(params.uploadBatchId, {
        cursor: params.cursor,
        limit,
        q: params.q,
      });
    }

    const where = this.buildWhere(params);
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
            select: { rowNumber: true },
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
    },
    rowNumber: number | null,
  ): PublicQuestionCard {
    const correct = q.options.find((o) => o.isCorrect);
    const correctAnswerLabel = correct?.label ?? '';
    return {
      id: q.id,
      title: q.title,
      content: q.content,
      difficulty: q.difficulty,
      examTags: q.examTags,
      sourceNote: q.sourceNote,
      sourceLabel: this.sourceLabel(q.sourceNote, q.examTags, q.category.name),
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

  private setTitle(batch: {
    displayName: string;
    examCategoryHint: string | null;
    subjectHint: string | null;
  }): string {
    if (batch.examCategoryHint?.trim()) return batch.examCategoryHint.trim();
    if (batch.displayName?.trim()) return batch.displayName.trim();
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

  private sourceLabel(
    sourceNote: string | null,
    examTags: string[],
    categoryName: string,
  ): string | null {
    if (sourceNote?.trim()) {
      const primary = sourceNote
        .split('·')
        .map((s) => s.trim())
        .find((s) => s && !/^Batch\s/i.test(s) && !/^Year\s/i.test(s));
      if (primary) return primary;
    }
    if (examTags[0]) return examTags[0];
    return categoryName || null;
  }
}

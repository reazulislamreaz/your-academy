import { Injectable } from '@nestjs/common';
import { Difficulty, Prisma, QuestionStatus } from '@prisma/client';
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
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [questions, categories, news, documents] = await Promise.all([
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
    ]);
    return { questions, categories, news, documents };
  }

  async listPublishedQuestions(params: {
    cursor?: string;
    limit?: number;
    categoryId?: string;
    subcategoryId?: string;
    difficulty?: Difficulty;
    q?: string;
    examTag?: string;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const where = this.buildWhere(params);

    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        take: limit + 1,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        // Latest uploads first (DEC-031 public bank).
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
        },
      }),
    ]);

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    const cards: PublicQuestionCard[] = items.map((q) => {
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
      };
    });

    return { items: cards, nextCursor, total };
  }

  private buildWhere(params: {
    categoryId?: string;
    subcategoryId?: string;
    difficulty?: Difficulty;
    q?: string;
    examTag?: string;
  }): Prisma.QuestionWhereInput {
    return {
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
              { sourceNote: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /** Prefer human exam/source text for the card chip. */
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

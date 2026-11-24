import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { Prisma, QuestionStatus } from '@prisma/client';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { AccessPolicyService } from '../billing/access-policy.service';

const MAX_COLLECTIONS_PER_USER = 50;
/** Upper bound for one saved-questions exam (keeps the score query and the sheet bounded). */
export const MAX_SAVED_EXAM_QUESTIONS = 200;

/** `collectionId` query value: a folder id, `uncategorized` (no folder) or absent (everything). */
export type CollectionFilter = string | 'uncategorized' | undefined;

export type SavedPracticeScoreItem = {
  id: string;
  selectedOptionId: string | null;
  isSkipped: boolean;
  isCorrect: boolean;
  correctOptionId: string | null;
  correctAnswerLabel: string;
  explanation: string | null;
};

@Injectable()
export class BookmarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningActivity: LearningActivityService,
    private readonly access: AccessPolicyService,
  ) {}

  /** Owner-checked Prisma filter for a folder selection. */
  private async collectionWhere(userId: string, collectionId: CollectionFilter) {
    if (collectionId === 'uncategorized') return { collectionId: null };
    if (!collectionId) return {};
    await this.assertCollectionOwner(userId, collectionId);
    return { collectionId };
  }

  /** DEC-060: saved MCQs from locked Preli sets are skipped (no stem / key sent). */
  private async openQuestionWhere(user: RequestUser): Promise<Prisma.QuestionWhereInput> {
    const open = await this.access.openPreliQuestionsWhere(await this.access.resolve(user));
    return {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
      ...(open ? { AND: [open] } : {}),
    };
  }

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private async assertCollectionOwner(userId: string, collectionId: string) {
    const collection = await this.prisma.bookmarkCollection.findFirst({
      where: { id: collectionId, userId },
    });
    if (!collection) {
      throw new NotFoundException(
        createErrorResponse('COLLECTION_NOT_FOUND', 'Collection not found', newRequestId()),
      );
    }
    return collection;
  }

  private async resolveTargetCollectionId(
    userId: string,
    opts: { collectionId?: string | null; newCollectionName?: string },
  ): Promise<string | null> {
    if (opts.collectionId) {
      await this.assertCollectionOwner(userId, opts.collectionId);
      return opts.collectionId;
    }
    if (opts.newCollectionName) {
      const created = await this.createCollection(userId, opts.newCollectionName);
      return created.id;
    }
    return opts.collectionId === null ? null : null;
  }

  async listCollections(
    user: RequestUser,
    opts: { questionId?: string; documentId?: string } = {},
  ) {
    const collections = await this.prisma.bookmarkCollection.findMany({
      where: { userId: user.userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { bookmarks: true, documentBookmarks: true } } },
    });

    // Picker state for the item being saved (an MCQ or a PDF).
    let activeCollectionId: string | null | undefined;
    let bookmarked = false;
    const picking = Boolean(opts.questionId || opts.documentId);
    if (opts.questionId || opts.documentId) {
      const bookmark = opts.questionId
        ? await this.prisma.questionBookmark.findUnique({
            where: {
              userId_questionId: { userId: user.userId, questionId: opts.questionId },
            },
            select: { collectionId: true },
          })
        : await this.prisma.documentBookmark.findUnique({
            where: {
              userId_documentId: { userId: user.userId, documentId: opts.documentId! },
            },
            select: { collectionId: true },
          });
      bookmarked = Boolean(bookmark);
      activeCollectionId = bookmark?.collectionId ?? (bookmark ? null : undefined);
    }

    const [uncategorizedCount, uncategorizedDocumentCount] = await Promise.all([
      this.prisma.questionBookmark.count({ where: { userId: user.userId, collectionId: null } }),
      this.prisma.documentBookmark.count({ where: { userId: user.userId, collectionId: null } }),
    ]);

    return {
      items: collections.map((c) => ({
        id: c.id,
        name: c.name,
        questionCount: c._count.bookmarks,
        documentCount: c._count.documentBookmarks,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        // Field name kept for existing clients; true when the picked MCQ or PDF is here.
        containsQuestion: picking ? bookmarked && activeCollectionId === c.id : undefined,
      })),
      uncategorized: {
        id: null as null,
        name: 'Saved Items',
        questionCount: uncategorizedCount,
        documentCount: uncategorizedDocumentCount,
        containsQuestion: picking ? bookmarked && activeCollectionId === null : undefined,
      },
      bookmarked,
      activeCollectionId: bookmarked ? (activeCollectionId ?? null) : null,
    };
  }

  async createCollection(userId: string, rawName: string) {
    const name = this.normalizeName(rawName);
    if (!name) {
      throw new BadRequestException(
        createErrorResponse('COLLECTION_NAME_REQUIRED', 'Folder name is required', newRequestId()),
      );
    }

    const count = await this.prisma.bookmarkCollection.count({ where: { userId } });
    if (count >= MAX_COLLECTIONS_PER_USER) {
      throw new BadRequestException(
        createErrorResponse(
          'COLLECTION_LIMIT',
          `You can create up to ${MAX_COLLECTIONS_PER_USER} folders`,
          newRequestId(),
        ),
      );
    }

    const existing = await this.prisma.bookmarkCollection.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        createErrorResponse('COLLECTION_EXISTS', 'A folder with this name already exists', newRequestId()),
      );
    }

    try {
      return await this.prisma.bookmarkCollection.create({
        data: { userId, name },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('COLLECTION_EXISTS', 'A folder with this name already exists', newRequestId()),
      );
    }
  }

  async renameCollection(user: RequestUser, collectionId: string, rawName: string) {
    await this.assertCollectionOwner(user.userId, collectionId);
    const name = this.normalizeName(rawName);
    if (!name) {
      throw new BadRequestException(
        createErrorResponse('COLLECTION_NAME_REQUIRED', 'Folder name is required', newRequestId()),
      );
    }

    const clash = await this.prisma.bookmarkCollection.findFirst({
      where: {
        userId: user.userId,
        id: { not: collectionId },
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (clash) {
      throw new ConflictException(
        createErrorResponse('COLLECTION_EXISTS', 'A folder with this name already exists', newRequestId()),
      );
    }

    try {
      return await this.prisma.bookmarkCollection.update({
        where: { id: collectionId },
        data: { name },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('COLLECTION_EXISTS', 'A folder with this name already exists', newRequestId()),
      );
    }
  }

  async deleteCollection(user: RequestUser, collectionId: string) {
    await this.assertCollectionOwner(user.userId, collectionId);
    // Saved MCQs and PDFs are kept via ON DELETE SET NULL (they leave the folder, not the account).
    await this.prisma.bookmarkCollection.delete({ where: { id: collectionId } });
    return { ok: true };
  }

  async listQuestions(
    user: RequestUser,
    opts: {
      cursor?: string;
      limit?: number;
      categoryId?: string;
      collectionId?: string | 'uncategorized';
    } = {},
  ) {
    const take = Math.min(opts.limit ?? 20, 100);
    const collectionFilter = await this.collectionWhere(user.userId, opts.collectionId);

    const items = await this.prisma.questionBookmark.findMany({
      where: {
        userId: user.userId,
        ...collectionFilter,
        ...(opts.categoryId
          ? {
              question: {
                OR: [{ categoryId: opts.categoryId }, { subcategoryId: opts.categoryId }],
              },
            }
          : {}),
      },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: { select: { id: true, name: true } },
          },
        },
        collection: { select: { id: true, name: true } },
      },
    });
    const nextCursor = items.length > take ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async addQuestion(
    user: RequestUser,
    questionId: string,
    opts: { collectionId?: string | null; newCollectionName?: string } = {},
  ) {
    if (opts.collectionId && opts.newCollectionName) {
      throw new BadRequestException(
        createErrorResponse(
          'COLLECTION_TARGET_AMBIGUOUS',
          'Provide either collectionId or newCollectionName',
          newRequestId(),
        ),
      );
    }

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, status: 'PUBLISHED', deletedAt: null },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }

    const collectionId = await this.resolveTargetCollectionId(user.userId, opts);
    const existing = await this.prisma.questionBookmark.findUnique({
      where: {
        userId_questionId: { userId: user.userId, questionId },
      },
      include: { collection: { select: { id: true, name: true } } },
    });

    if (existing) {
      // Same folder → idempotent success (no duplicate in folder).
      if (existing.collectionId === collectionId) {
        return {
          id: existing.id,
          userId: existing.userId,
          questionId: existing.questionId,
          collectionId: existing.collectionId,
          createdAt: existing.createdAt,
          collection: existing.collection,
          created: false,
          moved: false,
        };
      }
      const updated = await this.prisma.questionBookmark.update({
        where: { id: existing.id },
        data: { collectionId },
        include: { collection: { select: { id: true, name: true } } },
      });
      return {
        id: updated.id,
        userId: updated.userId,
        questionId: updated.questionId,
        collectionId: updated.collectionId,
        createdAt: updated.createdAt,
        collection: updated.collection,
        created: false,
        moved: true,
      };
    }

    try {
      const bookmark = await this.prisma.questionBookmark.create({
        data: { userId: user.userId, questionId, collectionId },
        include: { collection: { select: { id: true, name: true } } },
      });
      await this.learningActivity.record({
        userId: user.userId,
        type: 'BOOKMARK_QUESTION',
        subjectCategoryId: question.categoryId,
        topicCategoryId: question.subcategoryId,
        questionId: question.id,
      });
      return {
        id: bookmark.id,
        userId: bookmark.userId,
        questionId: bookmark.questionId,
        collectionId: bookmark.collectionId,
        createdAt: bookmark.createdAt,
        collection: bookmark.collection,
        created: true,
        moved: false,
      };
    } catch {
      throw new ConflictException(
        createErrorResponse('BOOKMARK_EXISTS', 'Already bookmarked', newRequestId()),
      );
    }
  }

  async moveQuestion(
    user: RequestUser,
    questionId: string,
    collectionId: string | null,
  ) {
    const bookmark = await this.prisma.questionBookmark.findUnique({
      where: {
        userId_questionId: { userId: user.userId, questionId },
      },
    });
    if (!bookmark) {
      throw new NotFoundException(
        createErrorResponse('BOOKMARK_NOT_FOUND', 'Saved question not found', newRequestId()),
      );
    }
    if (collectionId) {
      await this.assertCollectionOwner(user.userId, collectionId);
    }
    if (bookmark.userId !== user.userId) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Not allowed', newRequestId()),
      );
    }

    return this.prisma.questionBookmark.update({
      where: { id: bookmark.id },
      data: { collectionId },
      include: { collection: { select: { id: true, name: true } } },
    });
  }

  async removeQuestion(user: RequestUser, questionId: string) {
    await this.prisma.questionBookmark.deleteMany({
      where: { userId: user.userId, questionId },
    });
    return { ok: true };
  }

  async listDocuments(
    user: RequestUser,
    opts: { cursor?: string; limit?: number; collectionId?: CollectionFilter } = {},
  ) {
    const take = Math.min(opts.limit ?? 20, 100);
    const collectionFilter = await this.collectionWhere(user.userId, opts.collectionId);
    const items = await this.prisma.documentBookmark.findMany({
      where: { userId: user.userId, ...collectionFilter },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        document: { select: { id: true, title: true, visibility: true } },
        collection: { select: { id: true, name: true } },
      },
    });
    const nextCursor = items.length > take ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  /**
   * Save a PDF, optionally into a folder (or a new one). Mirrors `addQuestion`:
   * one bookmark per user+PDF; saving again into the same folder is a no-op and
   * into another folder moves it.
   */
  async addDocument(
    user: RequestUser,
    documentId: string,
    opts: { collectionId?: string | null; newCollectionName?: string } = {},
  ) {
    if (opts.collectionId && opts.newCollectionName) {
      throw new BadRequestException(
        createErrorResponse(
          'COLLECTION_TARGET_AMBIGUOUS',
          'Provide either collectionId or newCollectionName',
          newRequestId(),
        ),
      );
    }
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, isPublished: true, deletedAt: null },
    });
    if (!doc) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }

    const collectionId = await this.resolveTargetCollectionId(user.userId, opts);
    const include = { collection: { select: { id: true, name: true } } } as const;
    const existing = await this.prisma.documentBookmark.findUnique({
      where: { userId_documentId: { userId: user.userId, documentId } },
      include,
    });
    if (existing) {
      if (existing.collectionId === collectionId) {
        return { ...existing, created: false, moved: false };
      }
      const updated = await this.prisma.documentBookmark.update({
        where: { id: existing.id },
        data: { collectionId },
        include,
      });
      return { ...updated, created: false, moved: true };
    }

    try {
      const bookmark = await this.prisma.documentBookmark.create({
        data: { userId: user.userId, documentId, collectionId },
        include,
      });
      await this.learningActivity.record({
        userId: user.userId,
        type: 'BOOKMARK_DOCUMENT',
        subjectCategoryId: doc.categoryId,
        meta: { documentId: doc.id },
      });
      return { ...bookmark, created: true, moved: false };
    } catch {
      throw new ConflictException(
        createErrorResponse('BOOKMARK_EXISTS', 'Already bookmarked', newRequestId()),
      );
    }
  }

  async moveDocument(user: RequestUser, documentId: string, collectionId: string | null) {
    const bookmark = await this.prisma.documentBookmark.findUnique({
      where: { userId_documentId: { userId: user.userId, documentId } },
    });
    if (!bookmark) {
      throw new NotFoundException(
        createErrorResponse('BOOKMARK_NOT_FOUND', 'Saved PDF not found', newRequestId()),
      );
    }
    if (collectionId) {
      await this.assertCollectionOwner(user.userId, collectionId);
    }
    return this.prisma.documentBookmark.update({
      where: { id: bookmark.id },
      data: { collectionId },
      include: { collection: { select: { id: true, name: true } } },
    });
  }

  async removeDocument(user: RequestUser, documentId: string) {
    await this.prisma.documentBookmark.deleteMany({
      where: { userId: user.userId, documentId },
    });
    return { ok: true };
  }

  /**
   * Saved MCQs with stem + options + key for the Saved page "View All" sheet and the
   * saved-questions exam. Same lock as `/questions/:id` (DEC-060).
   */
  async listQuestionDetails(
    user: RequestUser,
    opts: { cursor?: string; limit?: number; collectionId?: CollectionFilter } = {},
  ) {
    const take = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const collectionFilter = await this.collectionWhere(user.userId, opts.collectionId);
    const questionWhere = await this.openQuestionWhere(user);
    const [rows] = await Promise.all([
      this.prisma.questionBookmark.findMany({
        where: {
          userId: user.userId,
          ...collectionFilter,
          question: questionWhere,
        },
        take: take + 1,
        ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          collection: { select: { id: true, name: true } },
          question: {
            select: {
              id: true,
              title: true,
              content: true,
              explanation: true,
              difficulty: true,
              sectionTitle: true,
              category: { select: { id: true, name: true } },
              subcategory: { select: { id: true, name: true } },
              options: {
                orderBy: { sortOrder: 'asc' },
                select: { id: true, label: true, content: true, isCorrect: true, sortOrder: true },
              },
            },
          },
        },
      }),
    ]);
    const nextCursor = rows.length > take ? rows.pop()!.id : null;

    const items = rows.map((row) => {
      const { explanation, options, ...question } = row.question;
      return {
        id: row.id,
        createdAt: row.createdAt,
        collection: row.collection,
        question: {
          ...question,
          options,
          explanation: explanation ?? null,
        },
      };
    });
    return { items, nextCursor };
  }

  /**
   * Score an exam taken from saved questions. Only questions the user has saved
   * count — any other id in the request is ignored — so the endpoint cannot be
   * used to grade arbitrary bank questions; locked-set questions are skipped (DEC-060).
   */
  async scoreSavedPractice(
    user: RequestUser,
    questionIdsRaw: string[],
    answersRaw: Record<string, unknown>,
  ) {
    const requested = [...new Set(questionIdsRaw)].slice(0, MAX_SAVED_EXAM_QUESTIONS);
    const questionWhere = await this.openQuestionWhere(user);
    const [owned] = await Promise.all([
      requested.length
        ? this.prisma.questionBookmark.findMany({
            where: {
              userId: user.userId,
              questionId: { in: requested },
              question: questionWhere,
            },
            select: {
              question: {
                select: {
                  id: true,
                  explanation: true,
                  options: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, label: true, isCorrect: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);
    const byId = new Map(owned.map((b) => [b.question.id, b.question]));

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const answerSheet: SavedPracticeScoreItem[] = [];
    for (const id of requested) {
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
        explanation: q.explanation ?? null,
      });
    }

    const totalQuestions = answerSheet.length;
    return {
      totalQuestions,
      correctCount,
      wrongCount,
      skippedCount,
      score: correctCount,
      percent: totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 1000) / 10,
      answerSheet,
    };
  }
}

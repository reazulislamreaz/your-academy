import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';

const MAX_COLLECTIONS_PER_USER = 50;

@Injectable()
export class BookmarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningActivity: LearningActivityService,
  ) {}

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

  async listCollections(user: RequestUser, opts: { questionId?: string } = {}) {
    const collections = await this.prisma.bookmarkCollection.findMany({
      where: { userId: user.userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { bookmarks: true } } },
    });

    let activeCollectionId: string | null | undefined;
    let bookmarked = false;
    if (opts.questionId) {
      const bookmark = await this.prisma.questionBookmark.findUnique({
        where: {
          userId_questionId: { userId: user.userId, questionId: opts.questionId },
        },
        select: { collectionId: true },
      });
      bookmarked = Boolean(bookmark);
      activeCollectionId = bookmark?.collectionId ?? (bookmark ? null : undefined);
    }

    const uncategorizedCount = await this.prisma.questionBookmark.count({
      where: { userId: user.userId, collectionId: null },
    });

    return {
      items: collections.map((c) => ({
        id: c.id,
        name: c.name,
        questionCount: c._count.bookmarks,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        containsQuestion: opts.questionId
          ? bookmarked && activeCollectionId === c.id
          : undefined,
      })),
      uncategorized: {
        id: null as null,
        name: 'Saved Items',
        questionCount: uncategorizedCount,
        containsQuestion: opts.questionId
          ? bookmarked && activeCollectionId === null
          : undefined,
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
    // Bookmarks keep via ON DELETE SET NULL (uncategorized).
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
    const collectionFilter =
      opts.collectionId === 'uncategorized'
        ? { collectionId: null }
        : opts.collectionId
          ? { collectionId: opts.collectionId }
          : {};

    if (opts.collectionId && opts.collectionId !== 'uncategorized') {
      await this.assertCollectionOwner(user.userId, opts.collectionId);
    }

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
    opts: { cursor?: string; limit?: number } = {},
  ) {
    const take = Math.min(opts.limit ?? 20, 100);
    const items = await this.prisma.documentBookmark.findMany({
      where: { userId: user.userId },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { document: { select: { id: true, title: true, visibility: true } } },
    });
    const nextCursor = items.length > take ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async addDocument(user: RequestUser, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, isPublished: true, deletedAt: null },
    });
    if (!doc) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }
    try {
      const bookmark = await this.prisma.documentBookmark.create({
        data: { userId: user.userId, documentId },
      });
      await this.learningActivity.record({
        userId: user.userId,
        type: 'BOOKMARK_DOCUMENT',
        subjectCategoryId: doc.categoryId,
        meta: { documentId: doc.id },
      });
      return bookmark;
    } catch {
      throw new ConflictException(
        createErrorResponse('BOOKMARK_EXISTS', 'Already bookmarked', newRequestId()),
      );
    }
  }

  async removeDocument(user: RequestUser, documentId: string) {
    await this.prisma.documentBookmark.deleteMany({
      where: { userId: user.userId, documentId },
    });
    return { ok: true };
  }
}

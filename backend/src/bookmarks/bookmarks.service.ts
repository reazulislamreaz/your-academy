import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async listQuestions(
    user: RequestUser,
    opts: { cursor?: string; limit?: number; categoryId?: string } = {},
  ) {
    const take = Math.min(opts.limit ?? 20, 100);
    const items = await this.prisma.questionBookmark.findMany({
      where: {
        userId: user.userId,
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
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });
    const nextCursor = items.length > take ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async addQuestion(user: RequestUser, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, status: 'PUBLISHED', deletedAt: null },
    });
    if (!question) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Question not found', newRequestId()),
      );
    }
    try {
      return await this.prisma.questionBookmark.create({
        data: { userId: user.userId, questionId },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('BOOKMARK_EXISTS', 'Already bookmarked', newRequestId()),
      );
    }
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
      orderBy: { createdAt: 'desc' },
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
      return await this.prisma.documentBookmark.create({
        data: { userId: user.userId, documentId },
      });
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

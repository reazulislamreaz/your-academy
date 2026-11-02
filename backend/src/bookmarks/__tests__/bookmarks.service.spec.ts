import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookmarksService } from '../bookmarks.service';

describe('BookmarksService', () => {
  const prisma = {
    question: { findFirst: jest.fn() },
    document: { findFirst: jest.fn() },
    questionBookmark: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    documentBookmark: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const service = new BookmarksService(prisma as never);
  const user = { userId: 'user-1', role: 'USER' as const, sessionId: 'sess-1' };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('questions', () => {
    it('creates a bookmark for a published question', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: 'q1' });
      prisma.questionBookmark.create.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
      });

      await expect(service.addQuestion(user, 'q1')).resolves.toMatchObject({
        questionId: 'q1',
      });
      expect(prisma.questionBookmark.create).toHaveBeenCalledWith({
        data: { userId: user.userId, questionId: 'q1' },
      });
    });

    it('returns 409 when duplicate bookmark', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: 'q1' });
      prisma.questionBookmark.create.mockRejectedValue(new Error('Unique constraint'));

      await expect(service.addQuestion(user, 'q1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 404 when question missing', async () => {
      prisma.question.findFirst.mockResolvedValue(null);
      await expect(service.addQuestion(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists only the current user bookmarks with cursor page size', async () => {
      prisma.questionBookmark.findMany.mockResolvedValue([
        { id: 'b1', question: { id: 'q1' } },
        { id: 'b2', question: { id: 'q2' } },
        { id: 'b3', question: { id: 'q3' } },
      ]);

      const page = await service.listQuestions(user, { limit: 2 });
      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBe('b3');
      expect(prisma.questionBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: user.userId },
          take: 3,
        }),
      );
    });

    it('deletes scoped to the authenticated user', async () => {
      prisma.questionBookmark.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.removeQuestion(user, 'q1')).resolves.toEqual({ ok: true });
      expect(prisma.questionBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.userId, questionId: 'q1' },
      });
    });
  });

  describe('documents', () => {
    it('creates a bookmark for a published document', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1' });
      prisma.documentBookmark.create.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        documentId: 'd1',
      });

      await expect(service.addDocument(user, 'd1')).resolves.toMatchObject({
        documentId: 'd1',
      });
    });

    it('returns 409 when duplicate document bookmark', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1' });
      prisma.documentBookmark.create.mockRejectedValue(new Error('Unique constraint'));
      await expect(service.addDocument(user, 'd1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes document bookmarks only for owner', async () => {
      prisma.documentBookmark.deleteMany.mockResolvedValue({ count: 0 });
      await service.removeDocument(user, 'd1');
      expect(prisma.documentBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.userId, documentId: 'd1' },
      });
    });
  });
});

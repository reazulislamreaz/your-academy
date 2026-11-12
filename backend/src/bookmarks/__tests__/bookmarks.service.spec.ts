import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookmarksService } from '../bookmarks.service';

describe('BookmarksService', () => {
  const prisma = {
    question: { findFirst: jest.fn() },
    document: { findFirst: jest.fn() },
    questionBookmark: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    documentBookmark: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    bookmarkCollection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const learningActivity = { record: jest.fn() };
  const service = new BookmarksService(prisma as never, learningActivity as never);
  const user = { userId: 'user-1', role: 'USER' as const, sessionId: 'sess-1' };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('questions', () => {
    it('creates a bookmark for a published question', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.questionBookmark.findUnique.mockResolvedValue(null);
      prisma.questionBookmark.create.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: null,
        createdAt: new Date(),
        collection: null,
      });

      await expect(service.addQuestion(user, 'q1')).resolves.toMatchObject({
        questionId: 'q1',
        created: true,
        moved: false,
      });
      expect(prisma.questionBookmark.create).toHaveBeenCalledWith({
        data: { userId: user.userId, questionId: 'q1', collectionId: null },
        include: { collection: { select: { id: true, name: true } } },
      });
      expect(learningActivity.record).toHaveBeenCalled();
    });

    it('saves into an owned collection', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.bookmarkCollection.findFirst.mockResolvedValue({
        id: 'col1',
        userId: user.userId,
        name: 'Weak topics',
      });
      prisma.questionBookmark.findUnique.mockResolvedValue(null);
      prisma.questionBookmark.create.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: 'col1',
        createdAt: new Date(),
        collection: { id: 'col1', name: 'Weak topics' },
      });

      const result = await service.addQuestion(user, 'q1', { collectionId: 'col1' });
      expect(result).toMatchObject({ collectionId: 'col1', created: true });
      expect(prisma.questionBookmark.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: user.userId, questionId: 'q1', collectionId: 'col1' },
        }),
      );
    });

    it('moves an existing bookmark to another collection instead of 409', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.bookmarkCollection.findFirst.mockResolvedValue({
        id: 'col2',
        userId: user.userId,
        name: 'Exam week',
      });
      prisma.questionBookmark.findUnique.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: 'col1',
        createdAt: new Date(),
        collection: { id: 'col1', name: 'Old' },
      });
      prisma.questionBookmark.update.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: 'col2',
        createdAt: new Date(),
        collection: { id: 'col2', name: 'Exam week' },
      });

      const result = await service.addQuestion(user, 'q1', { collectionId: 'col2' });
      expect(result).toMatchObject({ moved: true, created: false, collectionId: 'col2' });
      expect(prisma.questionBookmark.create).not.toHaveBeenCalled();
      expect(learningActivity.record).not.toHaveBeenCalled();
    });

    it('is idempotent when saving into the same collection again', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.bookmarkCollection.findFirst.mockResolvedValue({
        id: 'col1',
        userId: user.userId,
        name: 'Weak topics',
      });
      prisma.questionBookmark.findUnique.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: 'col1',
        createdAt: new Date(),
        collection: { id: 'col1', name: 'Weak topics' },
      });

      const result = await service.addQuestion(user, 'q1', { collectionId: 'col1' });
      expect(result).toMatchObject({ created: false, moved: false, collectionId: 'col1' });
      expect(prisma.questionBookmark.update).not.toHaveBeenCalled();
    });

    it('creates a folder then saves when newCollectionName is provided', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.bookmarkCollection.count.mockResolvedValue(0);
      prisma.bookmarkCollection.findFirst.mockResolvedValue(null);
      prisma.bookmarkCollection.create.mockResolvedValue({
        id: 'col-new',
        userId: user.userId,
        name: 'Banking',
      });
      prisma.questionBookmark.findUnique.mockResolvedValue(null);
      prisma.questionBookmark.create.mockResolvedValue({
        id: 'b1',
        userId: user.userId,
        questionId: 'q1',
        collectionId: 'col-new',
        createdAt: new Date(),
        collection: { id: 'col-new', name: 'Banking' },
      });

      const result = await service.addQuestion(user, 'q1', { newCollectionName: 'Banking' });
      expect(result).toMatchObject({ collectionId: 'col-new', created: true });
      expect(prisma.bookmarkCollection.create).toHaveBeenCalled();
    });

    it('returns 404 when question missing', async () => {
      prisma.question.findFirst.mockResolvedValue(null);
      await expect(service.addQuestion(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when collection is not owned', async () => {
      prisma.question.findFirst.mockResolvedValue({
        id: 'q1',
        categoryId: 'cat1',
        subcategoryId: null,
      });
      prisma.bookmarkCollection.findFirst.mockResolvedValue(null);
      await expect(
        service.addQuestion(user, 'q1', { collectionId: 'other-col' }),
      ).rejects.toBeInstanceOf(NotFoundException);
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

    it('filters list by collection', async () => {
      prisma.bookmarkCollection.findFirst.mockResolvedValue({
        id: 'col1',
        userId: user.userId,
        name: 'Weak',
      });
      prisma.questionBookmark.findMany.mockResolvedValue([]);
      await service.listQuestions(user, { collectionId: 'col1', limit: 20 });
      expect(prisma.questionBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: user.userId, collectionId: 'col1' }),
        }),
      );
    });

    it('deletes only the current user bookmark', async () => {
      prisma.questionBookmark.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.removeQuestion(user, 'q1')).resolves.toEqual({ ok: true });
      expect(prisma.questionBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.userId, questionId: 'q1' },
      });
    });
  });

  describe('collections', () => {
    it('lists collections with counts and picker state', async () => {
      prisma.bookmarkCollection.findMany.mockResolvedValue([
        {
          id: 'col1',
          name: 'Weak',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { bookmarks: 3 },
        },
      ]);
      prisma.questionBookmark.findUnique.mockResolvedValue({ collectionId: 'col1' });
      prisma.questionBookmark.count.mockResolvedValue(2);

      const data = await service.listCollections(user, { questionId: 'q1' });
      expect(data.bookmarked).toBe(true);
      expect(data.activeCollectionId).toBe('col1');
      expect(data.items[0]).toMatchObject({
        id: 'col1',
        questionCount: 3,
        containsQuestion: true,
      });
      expect(data.uncategorized).toMatchObject({ questionCount: 2, containsQuestion: false });
    });

    it('creates a collection for the user', async () => {
      prisma.bookmarkCollection.count.mockResolvedValue(0);
      prisma.bookmarkCollection.findFirst.mockResolvedValue(null);
      prisma.bookmarkCollection.create.mockResolvedValue({
        id: 'col1',
        userId: user.userId,
        name: 'BCS',
      });
      await expect(service.createCollection(user.userId, '  BCS  ')).resolves.toMatchObject({
        name: 'BCS',
      });
    });

    it('rejects duplicate collection names', async () => {
      prisma.bookmarkCollection.count.mockResolvedValue(1);
      prisma.bookmarkCollection.findFirst.mockResolvedValue({ id: 'col1', name: 'BCS' });
      await expect(service.createCollection(user.userId, 'bcs')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deletes an owned collection', async () => {
      prisma.bookmarkCollection.findFirst.mockResolvedValue({
        id: 'col1',
        userId: user.userId,
        name: 'BCS',
      });
      prisma.bookmarkCollection.delete.mockResolvedValue({});
      await expect(service.deleteCollection(user, 'col1')).resolves.toEqual({ ok: true });
    });
  });

  describe('documents', () => {
    it('creates a document bookmark', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1', categoryId: 'cat1' });
      prisma.documentBookmark.create.mockResolvedValue({
        id: 'db1',
        userId: user.userId,
        documentId: 'd1',
      });
      await expect(service.addDocument(user, 'd1')).resolves.toMatchObject({ documentId: 'd1' });
    });

    it('returns 409 when duplicate document bookmark', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1', categoryId: 'cat1' });
      prisma.documentBookmark.create.mockRejectedValue(new Error('Unique constraint'));
      await expect(service.addDocument(user, 'd1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes only the current user document bookmark', async () => {
      prisma.documentBookmark.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.removeDocument(user, 'd1')).resolves.toEqual({ ok: true });
      expect(prisma.documentBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.userId, documentId: 'd1' },
      });
    });
  });
});

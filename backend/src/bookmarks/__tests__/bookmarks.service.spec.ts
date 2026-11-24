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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    user: { findUniqueOrThrow: jest.fn() },
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
  const access = {
    resolve: jest.fn(),
    openPreliQuestionsWhere: jest.fn(),
  };
  const service = new BookmarksService(
    prisma as never,
    learningActivity as never,
    access as never,
  );
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
          _count: { bookmarks: 3, documentBookmarks: 1 },
        },
      ]);
      prisma.questionBookmark.findUnique.mockResolvedValue({ collectionId: 'col1' });
      prisma.questionBookmark.count.mockResolvedValue(2);
      prisma.documentBookmark.count.mockResolvedValue(4);

      const data = await service.listCollections(user, { questionId: 'q1' });
      expect(data.bookmarked).toBe(true);
      expect(data.activeCollectionId).toBe('col1');
      expect(data.items[0]).toMatchObject({
        id: 'col1',
        questionCount: 3,
        documentCount: 1,
        containsQuestion: true,
      });
      expect(data.uncategorized).toMatchObject({
        questionCount: 2,
        documentCount: 4,
        containsQuestion: false,
      });
    });

    it('reports picker state for a PDF', async () => {
      prisma.bookmarkCollection.findMany.mockResolvedValue([
        {
          id: 'col1',
          name: 'Weak',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { bookmarks: 0, documentBookmarks: 1 },
        },
      ]);
      prisma.documentBookmark.findUnique.mockResolvedValue({ collectionId: 'col1' });
      prisma.questionBookmark.count.mockResolvedValue(0);
      prisma.documentBookmark.count.mockResolvedValue(0);

      const data = await service.listCollections(user, { documentId: 'd1' });
      expect(prisma.documentBookmark.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_documentId: { userId: user.userId, documentId: 'd1' } },
        }),
      );
      expect(prisma.questionBookmark.findUnique).not.toHaveBeenCalled();
      expect(data.items[0]?.containsQuestion).toBe(true);
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

    it('saves a PDF into an owned folder', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1', categoryId: 'cat1' });
      prisma.bookmarkCollection.findFirst.mockResolvedValue({ id: 'col1', userId: user.userId });
      prisma.documentBookmark.findUnique.mockResolvedValue(null);
      prisma.documentBookmark.create.mockResolvedValue({ id: 'db1', documentId: 'd1' });

      await expect(
        service.addDocument(user, 'd1', { collectionId: 'col1' }),
      ).resolves.toMatchObject({ created: true, moved: false });
      expect(prisma.documentBookmark.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: user.userId, documentId: 'd1', collectionId: 'col1' },
        }),
      );
    });

    it('rejects saving a PDF into another user folder', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1', categoryId: 'cat1' });
      prisma.bookmarkCollection.findFirst.mockResolvedValue(null);
      await expect(
        service.addDocument(user, 'd1', { collectionId: 'other-col' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.documentBookmark.create).not.toHaveBeenCalled();
    });

    it('is idempotent for the same folder and moves for another', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'd1', categoryId: 'cat1' });
      prisma.bookmarkCollection.findFirst.mockResolvedValue({ id: 'col2', userId: user.userId });
      prisma.documentBookmark.findUnique.mockResolvedValue({ id: 'db1', collectionId: 'col2' });
      await expect(
        service.addDocument(user, 'd1', { collectionId: 'col2' }),
      ).resolves.toMatchObject({ created: false, moved: false });
      expect(prisma.documentBookmark.update).not.toHaveBeenCalled();

      prisma.documentBookmark.findUnique.mockResolvedValue({ id: 'db1', collectionId: null });
      prisma.documentBookmark.update.mockResolvedValue({ id: 'db1', collectionId: 'col2' });
      await expect(
        service.addDocument(user, 'd1', { collectionId: 'col2' }),
      ).resolves.toMatchObject({ created: false, moved: true });
    });

    it('moves only the current user PDF bookmark', async () => {
      prisma.documentBookmark.findUnique.mockResolvedValue(null);
      await expect(service.moveDocument(user, 'd1', null)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.documentBookmark.findUnique).toHaveBeenCalledWith({
        where: { userId_documentId: { userId: user.userId, documentId: 'd1' } },
      });
    });

    it('filters PDFs by an owned folder and 404s on a foreign one', async () => {
      prisma.bookmarkCollection.findFirst.mockResolvedValue({ id: 'col1', userId: user.userId });
      prisma.documentBookmark.findMany.mockResolvedValue([]);
      await service.listDocuments(user, { collectionId: 'col1' });
      expect(prisma.documentBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: user.userId, collectionId: 'col1' } }),
      );

      prisma.bookmarkCollection.findFirst.mockResolvedValue(null);
      await expect(
        service.listDocuments(user, { collectionId: 'other-col' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes only the current user document bookmark', async () => {
      prisma.documentBookmark.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.removeDocument(user, 'd1')).resolves.toEqual({ ok: true });
      expect(prisma.documentBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.userId, documentId: 'd1' },
      });
    });
  });

  describe('saved question details (DEC-060 locks)', () => {
    const row = {
      id: 'b1',
      createdAt: new Date(),
      collection: null,
      question: {
        id: 'q1',
        title: 'T',
        content: 'C',
        explanation: 'Because',
        options: [
          { id: 'o1', label: 'A', content: 'x', isCorrect: true, sortOrder: 0 },
          { id: 'o2', label: 'B', content: 'y', isCorrect: false, sortOrder: 1 },
        ],
      },
    };
    const lock = { OR: [{ uploadBatchId: null }, { uploadBatchId: { in: ['free-set'] } }] };

    it('filters out saved MCQs from locked sets in the query itself', async () => {
      access.resolve.mockResolvedValue({ fullAccess: false });
      access.openPreliQuestionsWhere.mockResolvedValue(lock);
      prisma.questionBookmark.findMany.mockResolvedValue([row]);

      await service.listQuestionDetails(user, {});
      expect(prisma.questionBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: user.userId,
            question: expect.objectContaining({ AND: [lock] }),
          }),
        }),
      );
    });

    it('returns the key and explanation for open questions', async () => {
      access.resolve.mockResolvedValue({ fullAccess: true });
      access.openPreliQuestionsWhere.mockResolvedValue(undefined);
      prisma.questionBookmark.findMany.mockResolvedValue([row]);

      const page = await service.listQuestionDetails(user, {});
      const q = page.items[0]!.question;
      expect(q.explanation).toBe('Because');
      expect(q.options[0]!.isCorrect).toBe(true);
      const where = prisma.questionBookmark.findMany.mock.calls[0][0].where;
      expect(where.question).not.toHaveProperty('AND');
    });
  });

  describe('saved-questions exam scoring', () => {
    const saved = [
      {
        question: {
          id: 'q1',
          explanation: 'E1',
          options: [
            { id: 'o1', label: 'A', isCorrect: true },
            { id: 'o2', label: 'B', isCorrect: false },
          ],
        },
      },
      {
        question: {
          id: 'q2',
          explanation: null,
          options: [
            { id: 'o3', label: 'A', isCorrect: false },
            { id: 'o4', label: 'B', isCorrect: true },
          ],
        },
      },
    ];

    it('scores only open saved questions and ignores forged option ids', async () => {
      const lock = { OR: [{ uploadBatchId: null }] };
      access.resolve.mockResolvedValue({ fullAccess: false });
      access.openPreliQuestionsWhere.mockResolvedValue(lock);
      prisma.questionBookmark.findMany.mockResolvedValue(saved);

      const result = await service.scoreSavedPractice(user, ['q1', 'q2', 'not-saved'], {
        q1: 'o1',
        q2: 'o1', // option of another question → treated as skipped
        'not-saved': 'x',
      });

      expect(prisma.questionBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: user.userId,
            questionId: { in: ['q1', 'q2', 'not-saved'] },
            question: expect.objectContaining({ AND: [lock] }),
          }),
        }),
      );
      expect(result).toMatchObject({
        totalQuestions: 2,
        correctCount: 1,
        wrongCount: 0,
        skippedCount: 1,
        percent: 50,
      });
      expect(result.answerSheet[0]).toMatchObject({
        isCorrect: true,
        correctOptionId: 'o1',
        correctAnswerLabel: 'A',
        explanation: 'E1',
      });
    });
  });
});
